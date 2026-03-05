"""RAG API views."""

import json
import os
import re
import threading
from dataclasses import asdict
from typing import Optional

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from ..models import VectorIndex

from .llm.factory import get_llm_provider
from .services.indexing import clear_index, get_progress, index_vault
from .services.rag import query_rag
from .vectordb.chroma import ChromaStore


def _parse_json_body(request) -> Optional[dict]:
    try:
        parsed = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return None
    if isinstance(parsed, dict):
        return parsed
    return None


def _list_indexed_file_names(query: str, limit: int) -> list[str]:
    """Return unique indexed file basenames, optionally filtered by query."""
    q_lower = query.lower()
    seen: set[str] = set()
    names: list[str] = []

    for row in VectorIndex.objects.all().only("file_path"):  # pylint: disable=E1101
        name = os.path.basename(str(row.file_path))
        if not name or (q_lower and q_lower not in name.lower()):
            continue
        if name in seen:
            continue
        seen.add(name)
        names.append(name)

    names.sort()
    return names[:limit]


def _extract_frontmatter_tags_from_file(path: str) -> list[str]:
    """Read YAML frontmatter tags from a markdown file."""
    try:
        with open(path, "r", encoding="utf-8") as fh:
            lines = fh.read().splitlines()
    except OSError:
        return []

    if not lines or lines[0].strip() != "---":
        return []

    tags: list[str] = []
    reading_tags = False
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if "tags:" in line:
            reading_tags = True
            continue
        if reading_tags:
            stripped = line.strip()
            if stripped.startswith("-"):
                tags.append(stripped.lstrip("-").strip())
            elif stripped:
                reading_tags = False
    return tags


def _matches_scope(path: str, scope_module: str, scope_category: str) -> bool:
    """Return True when file frontmatter tags satisfy selected scope."""
    if not scope_module and not scope_category:
        return True

    def normalize(value: str) -> str:
        return re.sub(r"[^a-z0-9]", "", value.lower())

    raw_tags = _extract_frontmatter_tags_from_file(path)
    normalized_tags: set[str] = set()

    for tag in raw_tags:
        if not tag:
            continue
        normalized_tags.add(normalize(tag))
        for part in tag.split("/"):
            if part:
                normalized_tags.add(normalize(part))

    module_key = normalize(scope_module)
    category_key = normalize(scope_category)

    if module_key and module_key not in normalized_tags:
        return False
    if category_key and category_key not in normalized_tags:
        return False
    return True


# ------------------------------------------------------------------
# Query
# ------------------------------------------------------------------
@csrf_exempt
def rag_query_view(request):
    """POST /api/rag/query — ask a question against the vault."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    body = _parse_json_body(request)
    if body is None:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    query = str(body.get("query", "")).strip()
    if not query:
        return JsonResponse({"error": "query is required"}, status=400)

    scope_module = body.get("scope_module")
    scope_category = body.get("scope_category")
    top_k = int(body.get("top_k", 0))

    try:
        result = query_rag(
            query=query,
            scope_module=scope_module,
            scope_category=scope_category,
            top_k=top_k,
        )
        return JsonResponse(
            {
                "answer": result.answer,
                "citations": [asdict(c) for c in result.citations],
                "model_used": result.model_used,
                "chunks_retrieved": result.chunks_retrieved,
                "chunks_after_rerank": result.chunks_after_rerank,
            }
        )
    except Exception as exc:  # pylint: disable=W0718
        return JsonResponse({"error": f"RAG query failed: {exc}"}, status=500)


# ------------------------------------------------------------------
# Indexing
# ------------------------------------------------------------------
@csrf_exempt
def rag_index_start_view(request):
    """POST /api/rag/index/start — start full vault indexing."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    body = _parse_json_body(request) or {}
    force = bool(body.get("force", False))

    progress = get_progress()
    if progress.status == "running":
        return JsonResponse({"error": "Indexing is already running"}, status=409)

    # Run indexing in a background thread so the endpoint returns immediately.
    thread = threading.Thread(
        target=index_vault,
        kwargs={"force": force},
        daemon=True,
    )
    thread.start()

    return JsonResponse({"status": "started"})


@csrf_exempt
def rag_index_status_view(request):
    """GET /api/rag/index/status — poll indexing progress."""
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    progress = get_progress()
    return JsonResponse(
        {
            "status": progress.status,
            "total_files": progress.total_files,
            "processed_files": progress.processed_files,
            "skipped_files": progress.skipped_files,
            "total_chunks": progress.total_chunks,
            "current_file": progress.current_file,
            "errors": progress.errors[:20],
        }
    )


@csrf_exempt
def rag_index_clear_view(request):
    """DELETE /api/rag/index — clear the entire vector index."""
    if request.method != "DELETE":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    result = clear_index()
    return JsonResponse(result)


# ------------------------------------------------------------------
# Stats / Health
# ------------------------------------------------------------------
@csrf_exempt
def rag_stats_view(request):
    """GET /api/rag/stats — vector DB statistics."""
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        store = ChromaStore()
        return JsonResponse(store.stats())
    except Exception as exc:  # pylint: disable=W0718
        return JsonResponse({"error": f"Cannot read stats: {exc}"}, status=500)


@csrf_exempt
def rag_files_view(request):
    """GET /api/rag/files — filename suggestions for autocomplete."""
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    query = str(request.GET.get("q", "")).strip()
    scope_module = str(request.GET.get("scope_module", "")).strip()
    scope_category = str(request.GET.get("scope_category", "")).strip()
    raw_limit = str(request.GET.get("limit", "50")).strip()
    try:
        limit = int(raw_limit)
    except (TypeError, ValueError):
        limit = 50
    limit = max(1, min(limit, 200))

    try:
        q_lower = query.lower()
        seen: set[str] = set()
        files: list[str] = []

        # Prefer DB-backed index records, but fall back to vault scan if the
        # VectorIndex table is empty (e.g. after migrations on an existing Chroma DB).
        indexed_paths = [
            str(row.file_path)
            for row in VectorIndex.objects.all().only("file_path")  # pylint: disable=E1101
        ]

        if indexed_paths:
            source_paths = indexed_paths
        else:
            vault = getattr(settings, "VAULT_PATH", "")
            source_paths = []
            for root, _, filenames in os.walk(vault):
                for fname in filenames:
                    if fname.endswith(".md"):
                        source_paths.append(os.path.join(root, fname))

        for path in source_paths:
            name = os.path.basename(path)
            if not name or (q_lower and q_lower not in name.lower()):
                continue
            if name in seen:
                continue
            if not _matches_scope(path, scope_module, scope_category):
                continue

            seen.add(name)
            files.append(name)

        files.sort()
        files = files[:limit]
        return JsonResponse({"files": files})
    except Exception as exc:  # pylint: disable=W0718
        return JsonResponse({"error": f"Cannot list files: {exc}"}, status=500)


@csrf_exempt
def rag_health_view(request):
    """GET /api/rag/health — LLM provider health check."""
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        provider = get_llm_provider()
        return JsonResponse(provider.health_check())
    except Exception as exc:  # pylint: disable=W0718
        return JsonResponse({"healthy": False, "error": str(exc)}, status=500)

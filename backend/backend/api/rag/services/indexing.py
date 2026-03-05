"""Vault indexing service — discovers, hashes, chunks, and embeds notes."""

import logging
import os
import uuid
from dataclasses import dataclass, field
from typing import List, Optional

from django.conf import settings

from ...models import VectorIndex

from ..llm.factory import get_llm_provider
from ..vectordb.chroma import ChromaStore
from .chunking import chunk_markdown
from .hashing import file_content_hash

logger = logging.getLogger(__name__)

# Batch size for embedding requests.
EMBED_BATCH = 32

VAULT = getattr(settings, "VAULT_PATH", "/home/aleks/SecondBrain/")


@dataclass
class IndexProgress:
    """Mutable progress tracker shared with callers."""

    total_files: int = 0
    processed_files: int = 0
    skipped_files: int = 0
    total_chunks: int = 0
    current_file: str = ""
    errors: List[str] = field(default_factory=list)
    status: str = "idle"  # idle | running | done | error


# Module-level progress singleton so the status endpoint can read it.
_progress = IndexProgress()


def get_progress() -> IndexProgress:
    """Return the current indexing progress.

    If indexing is not running and total_chunks is 0, attempt to query
    ChromaDB for the actual count and VectorIndex for total files.
    """
    if _progress.status in ("idle", "done") and (
        _progress.total_chunks == 0 or _progress.total_files == 0
    ):
        try:
            store = ChromaStore()
            _progress.total_chunks = store.count()
            indexed_files = VectorIndex.objects.count()  # pylint: disable=E1101
            _progress.total_files = indexed_files
            if indexed_files == 0:
                _progress.total_files = len(_vault_markdown_files(_vault_path()))
        except Exception:  # pylint: disable=W0718
            # ChromaDB might not be accessible (missing LD_LIBRARY_PATH)
            pass
    return _progress


def _vault_path() -> str:
    return getattr(settings, "VAULT_PATH", VAULT)


def _vault_markdown_files(vault: str) -> List[str]:
    """Recursively find all ``.md`` files under *vault*."""
    paths: List[str] = []
    for root, _, filenames in os.walk(vault):
        for fname in filenames:
            if fname.endswith(".md"):
                paths.append(os.path.join(root, fname))
    paths.sort()
    return paths


def _read_file(path: str) -> Optional[str]:
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return fh.read()
    except OSError as exc:
        logger.warning("Cannot read %s: %s", path, exc)
        return None


def index_vault(
    vault: Optional[str] = None,
    force: bool = False,
    scope_module: Optional[str] = None,
    scope_category: Optional[str] = None,
) -> IndexProgress:
    """Index (or re-index) the entire vault.

    Parameters
    ----------
    vault:
        Override the vault root directory.
    force:
        If ``True``, re-index everything regardless of hashes.
    scope_module:
        If set, only index files whose frontmatter tags include this module.
    scope_category:
        If set, only index files whose frontmatter tags include this category.
    """
    vault = vault or _vault_path()
    _progress.status = "running"
    _progress.errors = []
    _progress.total_files = 0
    _progress.processed_files = 0
    _progress.skipped_files = 0
    _progress.total_chunks = 0
    _progress.current_file = ""

    try:
        if not os.path.isdir(vault):
            raise FileNotFoundError(f"Vault path does not exist: {vault}")

        provider = get_llm_provider()
        store = ChromaStore()

        all_files = _vault_markdown_files(vault)
        _progress.total_files = len(all_files)

        for path in all_files:
            _progress.current_file = os.path.relpath(path, vault)
            try:
                content = _read_file(path)
                if content is None:
                    _progress.errors.append(f"Unreadable: {path}")
                    continue

                # Scope filtering via frontmatter tags.
                tags = _extract_frontmatter_tags(content)
                if scope_module or scope_category:
                    if scope_module and scope_module.lower() not in {
                        t.lower() for t in tags
                    }:
                        _progress.skipped_files += 1
                        continue
                    if scope_category and scope_category.lower() not in {
                        t.lower() for t in tags
                    }:
                        _progress.skipped_files += 1
                        continue

                content_hash = file_content_hash(path)
                existing_index = VectorIndex.objects.filter(file_path=path).first()
                if (
                    not force
                    and existing_index is not None
                    and existing_index.content_hash == content_hash
                ):
                    _progress.skipped_files += 1
                    continue

                # Remove old chunks for this file.
                store.delete_by_file(path)

                chunks = chunk_markdown(content)
                if not chunks:
                    _progress.skipped_files += 1
                    continue

                # Embed in batches.
                chunk_texts = [c.text for c in chunks]
                all_embeddings: List[List[float]] = []
                for i in range(0, len(chunk_texts), EMBED_BATCH):
                    batch = chunk_texts[i : i + EMBED_BATCH]
                    resp = provider.embed(batch)
                    all_embeddings.extend(resp.embeddings)

                ids = [f"{path}::{uuid.uuid4().hex[:12]}" for _ in chunks]
                rel_path = os.path.relpath(path, vault)
                metadatas = [
                    {
                        "file_path": path,
                        "relative_path": rel_path,
                        "file_name": os.path.basename(path),
                        "heading": c.heading,
                        "line_start": c.line_start,
                        "line_end": c.line_end,
                        "tags": "|".join(tags),
                    }
                    for c in chunks
                ]

                store.upsert(
                    ids=ids,
                    embeddings=all_embeddings,
                    documents=chunk_texts,
                    metadatas=metadatas,
                )

                VectorIndex.objects.update_or_create(
                    file_path=path,
                    defaults={
                        "content_hash": content_hash,
                        "chunk_count": len(chunks),
                    },
                )
                _progress.processed_files += 1
                _progress.total_chunks += len(chunks)

            except Exception as exc:  # pylint: disable=W0718
                _progress.errors.append(f"{path}: {exc}")
                logger.exception("Error indexing %s", path)

        _progress.status = "done"

        # Update total_chunks with actual ChromaDB count
        try:
            _progress.total_chunks = store.count()
        except Exception as count_exc:  # pylint: disable=W0718
            logger.warning("Could not get ChromaDB count: %s", count_exc)

    except Exception as exc:  # pylint: disable=W0718
        _progress.status = "error"
        _progress.errors.append(str(exc))
        logger.exception("Indexing failed before completion")
    finally:
        _progress.current_file = ""

    return _progress


def _extract_frontmatter_tags(content: str) -> List[str]:
    """Quick extraction of tags from YAML frontmatter."""
    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        return []
    tags: List[str] = []
    reading = False
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if "tags:" in line:
            reading = True
            continue
        if reading:
            stripped = line.strip()
            if stripped.startswith("-"):
                tags.append(stripped.lstrip("-").strip())
            elif stripped:
                reading = False
    return tags


def clear_index() -> dict:
    """Drop the vector collection and reset file hashes."""
    store = ChromaStore()
    store.clear()
    VectorIndex.objects.all().delete()
    return {"cleared": True}

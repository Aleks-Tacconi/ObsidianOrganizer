import json
import os
import tempfile
from difflib import SequenceMatcher
from typing import Dict, List, Optional, Set, Tuple

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .models import Grade, ModuleInfo, Note, NoteURL, PrimaryTag, Section, SubTag
from .serializers import (
    GradeSerializer,
    ModuleInfoSerializer,
    NoteSerializer,
    NoteURLSerializer,
    PrimaryTagSerializer,
    SectionSerializer,
    SubTagSerializer,
)


class ModuleInfoView(viewsets.ModelViewSet):
    queryset = ModuleInfo.objects.all()
    serializer_class = ModuleInfoSerializer
    permission_classes = [AllowAny]


class GradeView(viewsets.ModelViewSet):
    queryset = Grade.objects.all()
    serializer_class = GradeSerializer
    permission_classes = [AllowAny]


class SectionView(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = [AllowAny]


class PrimaryTagView(viewsets.ModelViewSet):  # pylint: disable=R0901
    queryset = PrimaryTag.objects.all()  # pylint: disable=E1101
    serializer_class = PrimaryTagSerializer
    permission_classes = [AllowAny]


class SubTagView(viewsets.ModelViewSet):  # pylint: disable=R0901
    queryset = SubTag.objects.all()  # pylint: disable=E1101
    serializer_class = SubTagSerializer
    permission_classes = [AllowAny]


class NoteURLView(viewsets.ModelViewSet):  # pylint: disable=R0901
    queryset = NoteURL.objects.all()  # pylint: disable=E1101
    serializer_class = NoteURLSerializer
    permission_classes = [AllowAny]


class NoteView(viewsets.ModelViewSet):  # pylint: disable=R0901
    queryset = Note.objects.all().order_by("-date")  # pylint: disable=E1101
    serializer_class = NoteSerializer
    permission_classes = [AllowAny]


VAULT = "/home/aleks/SecondBrain/"


def extract_tags(file: str) -> List[str]:
    tags = []
    read = False

    with open(file=file, mode="r", encoding="utf-8") as f:
        for i, line in enumerate(f.readlines()):
            if i > 1 and line.rstrip() == "---":
                break
            if read:
                tags.append(line.replace("-", "").strip())
            if "tags:" in line:
                read = True

    return tags


def match_obsidian_tags(tags: List[str]) -> List[str]:
    matched_files: List[str] = []

    for filename in os.listdir(VAULT):
        path = os.path.join(VAULT, filename)

        if not os.path.isfile(path):
            continue

        file_tags = extract_tags(path)

        if set(file_tags).issuperset(set(tags)):
            matched_files.append(path)

    return matched_files


def _parse_module_topic_tag(tag: str) -> Optional[Tuple[str, str]]:
    cleaned_tag = tag.strip().lstrip("#")
    if "/" not in cleaned_tag:
        return None

    module, topic = cleaned_tag.split("/", 1)
    module = module.strip()
    topic = topic.strip()

    if not module or not topic:
        return None

    return module, topic


def _vault_markdown_files() -> List[Tuple[str, str]]:
    files: List[Tuple[str, str]] = []
    for filename in sorted(os.listdir(VAULT)):
        path = os.path.join(VAULT, filename)
        if not os.path.isfile(path) or not filename.endswith(".md"):
            continue
        files.append((filename, path))
    return files


def scan_vault_tags() -> List[Dict[str, object]]:
    module_topics: Dict[str, Set[str]] = {}

    for _, path in _vault_markdown_files():
        for tag in extract_tags(path):
            parsed = _parse_module_topic_tag(tag)
            if parsed is None:
                continue
            module, topic = parsed
            module_topics.setdefault(module, set()).add(topic)

    return [
        {"module": module, "topics": sorted(topics)}
        for module, topics in sorted(module_topics.items())
    ]


def list_untagged_vault_files() -> List[Dict[str, str]]:
    untagged_files: List[Dict[str, str]] = []

    for filename, path in _vault_markdown_files():
        has_module_topic_tag = False
        for tag in extract_tags(path):
            if _parse_module_topic_tag(tag) is not None:
                has_module_topic_tag = True
                break

        if not has_module_topic_tag:
            untagged_files.append({"name": filename, "path": path})

    return untagged_files


def _has_frontmatter(lines: List[str]) -> bool:
    return bool(lines) and lines[0].strip() == "---"


def _frontmatter_end_index(lines: List[str]) -> int:
    for index in range(1, len(lines)):
        if lines[index].strip() == "---":
            return index
    return -1


def _extract_existing_tags(
    frontmatter_lines: List[str], tags_index: int
) -> Tuple[List[str], int]:
    existing: List[str] = []
    insert_index = tags_index + 1

    while insert_index < len(frontmatter_lines):
        current = frontmatter_lines[insert_index]
        stripped = current.strip()

        if not stripped:
            insert_index += 1
            continue
        if stripped.startswith("-"):
            existing.append(stripped.lstrip("-").strip())
            insert_index += 1
            continue
        break

    return existing, insert_index


def apply_module_topic_tag(path: str, module: str, topic: str) -> bool:
    tag = f"{module}/{topic}"

    with open(path, "r", encoding="utf-8") as file:
        lines = file.readlines()

    if not _has_frontmatter(lines):
        updated_lines = ["---\n", "tags:\n", f"  - {tag}\n", "---\n"] + lines
    else:
        frontmatter_end = _frontmatter_end_index(lines)
        if frontmatter_end == -1:
            updated_lines = ["---\n", "tags:\n", f"  - {tag}\n", "---\n"] + lines
        else:
            frontmatter_lines = lines[1:frontmatter_end]
            tags_index = next(
                (
                    index
                    for index, line in enumerate(frontmatter_lines)
                    if line.strip().startswith("tags:")
                ),
                -1,
            )

            if tags_index == -1:
                frontmatter_lines.extend(["tags:\n", f"  - {tag}\n"])
            else:
                existing_tags, insert_index = _extract_existing_tags(
                    frontmatter_lines, tags_index
                )
                if tag in existing_tags:
                    return False
                frontmatter_lines.insert(insert_index, f"  - {tag}\n")

            updated_lines = (
                ["---\n"] + frontmatter_lines + ["---\n"] + lines[frontmatter_end + 1 :]
            )

    with tempfile.NamedTemporaryFile(
        mode="w",
        delete=False,
        dir=os.path.dirname(path),
        encoding="utf-8",
    ) as temp_file:
        temp_file.writelines(updated_lines)
        temp_path = temp_file.name

    os.replace(temp_path, path)
    return True


@csrf_exempt
def match_tags_view(request):
    body = json.loads(request.body)
    tags = body.get("tags", [])
    tags = [tag.replace(" ", "") for tag in tags]
    files = match_obsidian_tags(tags)

    return JsonResponse({"files": files})


@csrf_exempt
def scan_vault_tags_view(request):
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    return JsonResponse({"modules": scan_vault_tags()})


@csrf_exempt
def untagged_files_view(request):
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    return JsonResponse({"files": list_untagged_vault_files()})


@csrf_exempt
def apply_tags_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    body = json.loads(request.body)
    path = body.get("path")
    module = str(body.get("module", "")).strip()
    topic = str(body.get("topic", "")).strip()

    if not path or not path.startswith(VAULT):
        return JsonResponse({"error": "Invalid path"}, status=400)

    if not module or not topic:
        return JsonResponse({"error": "module and topic are required"}, status=400)

    if not os.path.isfile(path):
        return JsonResponse({"error": "Not found"}, status=404)

    updated = apply_module_topic_tag(path, module, topic)
    return JsonResponse({"path": path, "tag": f"{module}/{topic}", "updated": updated})


@csrf_exempt
def apply_tags_bulk_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    body = json.loads(request.body)
    paths = body.get("paths", [])
    module = str(body.get("module", "")).strip()
    topic = str(body.get("topic", "")).strip()

    if not isinstance(paths, list) or len(paths) == 0:
        return JsonResponse({"error": "paths is required"}, status=400)
    if not module or not topic:
        return JsonResponse({"error": "module and topic are required"}, status=400)

    tag = f"{module}/{topic}"
    results = []
    applied_count = 0
    failed_count = 0

    for path in paths:
        if not isinstance(path, str) or not path.startswith(VAULT):
            failed_count += 1
            results.append({"path": path, "updated": False, "error": "Invalid path"})
            continue

        if not os.path.isfile(path):
            failed_count += 1
            results.append({"path": path, "updated": False, "error": "Not found"})
            continue

        updated = apply_module_topic_tag(path, module, topic)
        if updated:
            applied_count += 1
        results.append({"path": path, "updated": updated})

    return JsonResponse(
        {
            "tag": tag,
            "applied_count": applied_count,
            "failed_count": failed_count,
            "results": results,
        }
    )


def get_file_content(file) -> str:
    lines = [line.rstrip() for line in file.readlines()]

    for i, line in enumerate(lines):
        if (i >= 1) and "---" in line:
            return "\n".join(lines[i + 1 :])

    return "\n".join(lines)


@csrf_exempt
def obsidian_file_view(request):
    body = json.loads(request.body)
    path = body.get("path")

    if not path or not path.startswith(VAULT):
        return JsonResponse({"error": "Invalid path"}, status=400)

    try:
        with open(path, "r", encoding="utf-8") as f:
            return JsonResponse(
                {
                    "path": path,
                    "name": os.path.basename(path),
                    "content": get_file_content(f),
                }
            )
    except FileNotFoundError:
        pass
    return JsonResponse({"error": "Not found"}, status=404)


def _line_fuzzy_score(query_lower: str, line_lower: str) -> float:
    """Return the best SequenceMatcher ratio for a sliding window over the line."""
    window_size = max(len(query_lower), 1)
    best_ratio = 0.0
    for i in range(max(1, len(line_lower) - window_size + 1)):
        window = line_lower[i : i + window_size]
        best_ratio = max(best_ratio, SequenceMatcher(None, query_lower, window).ratio())
    return best_ratio


def _extract_snippets(
    all_lines: List[str], query_lower: str, context: int = 2
) -> List[str]:
    """Return up to 3 context blocks around fuzzy-matched lines."""
    match_indices = [
        i
        for i, line in enumerate(all_lines)
        if line.strip() and _line_fuzzy_score(query_lower, line.strip().lower()) >= 0.6
    ]
    snippets: List[str] = []
    covered_up_to = -1
    for idx in match_indices[:3]:
        start = max(0, idx - context)
        end = min(len(all_lines) - 1, idx + context)
        if start <= covered_up_to:
            start = covered_up_to + 1
        if start > end:
            continue
        snippets.append("\n".join(line.rstrip() for line in all_lines[start : end + 1]))
        covered_up_to = end
    return snippets


@csrf_exempt
def search_in_files(request):
    body = json.loads(request.body)
    query: str = body.get("query", "")
    file_names: List[str] = body.get("files", [])

    if not query or not file_names:
        return JsonResponse({"results": []})

    query_lower = query.lower()
    results = []

    for name in file_names:
        bare = name[: len(name) - 3] if name.endswith(".md") else name
        path = os.path.join(VAULT, f"{bare}.md")

        if not os.path.isfile(path):
            continue

        try:
            with open(path, "r", encoding="utf-8") as f:
                content = get_file_content(f)
        except OSError:
            continue

        snippets = _extract_snippets(content.splitlines(), query_lower)
        if snippets:
            results.append({"name": bare, "snippets": snippets})

    return JsonResponse({"results": results})


@csrf_exempt
def obsidian_file_by_name(request):
    body = json.loads(request.body)
    name = body.get("name")
    print("name: ", name)
    if name.endswith(".md"):
        name = name[: len(name) - 3]

    for file in os.listdir(VAULT):
        if file == f"{name}.md":
            path = os.path.join(VAULT, file)
            with open(path, "r", encoding="utf-8") as f:
                return JsonResponse(
                    {
                        "name": file,
                        "content": get_file_content(f),
                    }
                )

    return JsonResponse({"error": "Not found"}, status=404)

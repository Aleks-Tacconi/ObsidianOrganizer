import json
import os
import re
import tempfile
from difflib import SequenceMatcher
from typing import Dict, List, Optional, Set, Tuple

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count, Q
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
    queryset = PrimaryTag.objects.prefetch_related("subtags").annotate(  # pylint: disable=E1101
        note_count=Count("notes", distinct=True),
        completed_note_count=Count(
            "notes", filter=Q(notes__completed=True), distinct=True
        ),
    )
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
                stripped = line.strip()
                if stripped.startswith("-"):
                    tags.append(stripped.lstrip("-").strip())
            if "tags:" in line:
                read = True

    return tags


def _normalize_tag_name(name: str) -> str:
    return "".join(str(name).split())


def _normalized_file_tags(path: str) -> Set[str]:
    return {_normalize_tag_name(tag) for tag in extract_tags(path)}


def _module_topic_pairs() -> List[Tuple[str, str]]:
    pairs: List[Tuple[str, str]] = []
    modules = PrimaryTag.objects.prefetch_related("subtags").all()  # pylint: disable=E1101
    for module in modules:
        normalized_module = _normalize_tag_name(module.name)
        for topic in module.subtags.all():
            pairs.append((normalized_module, _normalize_tag_name(topic.name)))
    return pairs


def _file_has_any_module_topic_pair(normalized_tags: Set[str]) -> bool:
    for module_tag, topic_tag in _module_topic_pairs():
        if module_tag in normalized_tags and topic_tag in normalized_tags:
            return True
    return False


def match_obsidian_tags(tags: List[str]) -> List[str]:
    matched_files: List[str] = []

    for _, path in _vault_markdown_files():
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
    for root, _, filenames in os.walk(VAULT):
        for filename in filenames:
            if not filename.endswith(".md"):
                continue
            path = os.path.join(root, filename)
            files.append((filename, path))

    files.sort(key=lambda entry: entry[1])
    return files


def _is_valid_vault_path(path: str) -> bool:
    if not isinstance(path, str):
        return False

    vault_root = os.path.realpath(VAULT)
    candidate = os.path.realpath(path)

    try:
        in_vault = os.path.commonpath([vault_root, candidate]) == vault_root
    except ValueError:
        return False

    return in_vault and candidate.endswith(".md")


def scan_vault_tags() -> List[Dict[str, object]]:
    module_topics: Dict[str, Set[str]] = {}
    known_pairs = _module_topic_pairs()

    for _, path in _vault_markdown_files():
        normalized_tags = _normalized_file_tags(path)
        matched_known_pair = False

        for module, topic in known_pairs:
            if module in normalized_tags and topic in normalized_tags:
                module_topics.setdefault(module, set()).add(topic)
                matched_known_pair = True

        if not matched_known_pair and len(normalized_tags) >= 2:
            ordered_tags = [_normalize_tag_name(tag) for tag in extract_tags(path)]
            if len(ordered_tags) >= 2:
                module = ordered_tags[0]
                for topic in ordered_tags[1:]:
                    if topic != module:
                        module_topics.setdefault(module, set()).add(topic)

    return [
        {"module": module, "topics": sorted(topics)}
        for module, topics in sorted(module_topics.items())
    ]


def list_untagged_vault_files() -> List[Dict[str, str]]:
    untagged_files: List[Dict[str, str]] = []

    for filename, path in _vault_markdown_files():
        normalized_tags = _normalized_file_tags(path)
        if not _file_has_any_module_topic_pair(normalized_tags):
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
    module_tag = _normalize_tag_name(module)
    topic_tag = _normalize_tag_name(topic)

    with open(path, "r", encoding="utf-8") as file:
        lines = file.readlines()

    if not _has_frontmatter(lines):
        updated_lines = [
            "---\n",
            "tags:\n",
            f"  - {module_tag}\n",
            f"  - {topic_tag}\n",
            "---\n",
        ] + lines
    else:
        frontmatter_end = _frontmatter_end_index(lines)
        if frontmatter_end == -1:
            updated_lines = [
                "---\n",
                "tags:\n",
                f"  - {module_tag}\n",
                f"  - {topic_tag}\n",
                "---\n",
            ] + lines
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
                frontmatter_lines.extend(
                    ["tags:\n", f"  - {module_tag}\n", f"  - {topic_tag}\n"]
                )
            else:
                existing_tags, insert_index = _extract_existing_tags(
                    frontmatter_lines, tags_index
                )
                normalized_existing = {
                    _normalize_tag_name(existing_tag) for existing_tag in existing_tags
                }
                tags_to_add = []
                if module_tag not in normalized_existing:
                    tags_to_add.append(module_tag)
                if topic_tag not in normalized_existing:
                    tags_to_add.append(topic_tag)

                if len(tags_to_add) == 0:
                    return False

                for index, tag_to_add in enumerate(tags_to_add):
                    frontmatter_lines.insert(
                        insert_index + index, f"  - {tag_to_add}\n"
                    )

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


def _parse_json_body(request) -> Optional[Dict[str, object]]:
    try:
        parsed = json.loads(request.body)
    except json.JSONDecodeError:
        return None

    if isinstance(parsed, dict):
        return parsed

    return None


def remove_module_topic_tag(path: str, module: str, topic: str) -> bool:
    module_tag = _normalize_tag_name(module)
    topic_tag = _normalize_tag_name(topic)

    with open(path, "r", encoding="utf-8") as file:
        lines = file.readlines()

    if not _has_frontmatter(lines):
        return False

    frontmatter_end = _frontmatter_end_index(lines)
    if frontmatter_end == -1:
        return False

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
        return False

    existing_tags, tags_end_index = _extract_existing_tags(
        frontmatter_lines, tags_index
    )
    normalized_existing = [
        _normalize_tag_name(existing_tag) for existing_tag in existing_tags
    ]
    if topic_tag not in normalized_existing:
        return False

    updated_tags = [
        existing_tag
        for existing_tag in existing_tags
        if _normalize_tag_name(existing_tag) != topic_tag
    ]

    sibling_topics = [
        _normalize_tag_name(subtag.name)
        for module_obj in PrimaryTag.objects.filter(name=module).prefetch_related(
            "subtags"
        )  # pylint: disable=E1101
        for subtag in module_obj.subtags.all()
        if _normalize_tag_name(subtag.name) != topic_tag
    ]
    normalized_updated_tags = {
        _normalize_tag_name(tag_name) for tag_name in updated_tags
    }
    has_other_module_topic = any(
        sibling_topic in normalized_updated_tags for sibling_topic in sibling_topics
    )
    if not sibling_topics:
        has_other_module_topic = any(
            normalized_tag != module_tag for normalized_tag in normalized_updated_tags
        )

    if not has_other_module_topic and module_tag in {
        _normalize_tag_name(tag_name) for tag_name in updated_tags
    }:
        updated_tags = [
            existing_tag
            for existing_tag in updated_tags
            if _normalize_tag_name(existing_tag) != module_tag
        ]

    rewritten_frontmatter_lines = (
        frontmatter_lines[: tags_index + 1]
        + [f"  - {existing_tag}\n" for existing_tag in updated_tags]
        + frontmatter_lines[tags_end_index:]
    )

    updated_lines = (
        ["---\n"]
        + rewritten_frontmatter_lines
        + ["---\n"]
        + lines[frontmatter_end + 1 :]
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


def get_category_membership(module: str, topic: str) -> Dict[str, List[Dict[str, str]]]:
    module_tag = _normalize_tag_name(module)
    topic_tag = _normalize_tag_name(topic)
    in_category: List[Dict[str, str]] = []
    not_in_category: List[Dict[str, str]] = []

    for filename, path in _vault_markdown_files():
        normalized_tags = _normalized_file_tags(path)
        if module_tag in normalized_tags and topic_tag in normalized_tags:
            in_category.append({"name": filename, "path": path})
        else:
            not_in_category.append({"name": filename, "path": path})

    return {"in_category": in_category, "not_in_category": not_in_category}


@csrf_exempt
def match_tags_view(request):
    body = _parse_json_body(request)
    if body is None:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    raw_tags = body.get("tags", [])
    if not isinstance(raw_tags, list):
        return JsonResponse({"error": "tags must be a list"}, status=400)

    tags = [_normalize_tag_name(tag) for tag in raw_tags]
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

    body = _parse_json_body(request)
    if body is None:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    path = body.get("path")
    module = str(body.get("module", "")).strip()
    topic = str(body.get("topic", "")).strip()

    if not isinstance(path, str) or not _is_valid_vault_path(path):
        return JsonResponse({"error": "Invalid path"}, status=400)

    if not module or not topic:
        return JsonResponse({"error": "module and topic are required"}, status=400)

    if not os.path.isfile(path):
        return JsonResponse({"error": "Not found"}, status=404)

    updated = apply_module_topic_tag(path, module, topic)
    return JsonResponse(
        {
            "path": path,
            "tag": f"{_normalize_tag_name(module)}|{_normalize_tag_name(topic)}",
            "updated": updated,
        }
    )


@csrf_exempt
def category_membership_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    body = _parse_json_body(request)
    if body is None:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    module = str(body.get("module", "")).strip()
    topic = str(body.get("topic", "")).strip()

    if not module or not topic:
        return JsonResponse({"error": "module and topic are required"}, status=400)

    result = get_category_membership(module, topic)
    return JsonResponse(result)


@csrf_exempt
def remove_tags_bulk_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    body = _parse_json_body(request)
    if body is None:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    raw_paths = body.get("paths", [])
    module = str(body.get("module", "")).strip()
    topic = str(body.get("topic", "")).strip()

    if not isinstance(raw_paths, list) or len(raw_paths) == 0:
        return JsonResponse({"error": "paths is required"}, status=400)
    if not module or not topic:
        return JsonResponse({"error": "module and topic are required"}, status=400)

    tag = f"{_normalize_tag_name(module)}|{_normalize_tag_name(topic)}"
    results = []
    removed_count = 0
    failed_count = 0

    for path in raw_paths:
        if not isinstance(path, str) or not _is_valid_vault_path(path):
            failed_count += 1
            results.append({"path": path, "updated": False, "error": "Invalid path"})
            continue

        if not os.path.isfile(path):
            failed_count += 1
            results.append({"path": path, "updated": False, "error": "Not found"})
            continue

        updated = remove_module_topic_tag(path, module, topic)
        if updated:
            removed_count += 1
        results.append({"path": path, "updated": updated})

    return JsonResponse(
        {
            "tag": tag,
            "removed_count": removed_count,
            "failed_count": failed_count,
            "results": results,
        }
    )


@csrf_exempt
def apply_tags_bulk_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    body = _parse_json_body(request)
    if body is None:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    raw_paths = body.get("paths", [])
    module = str(body.get("module", "")).strip()
    topic = str(body.get("topic", "")).strip()

    if not isinstance(raw_paths, list) or len(raw_paths) == 0:
        return JsonResponse({"error": "paths is required"}, status=400)
    if not module or not topic:
        return JsonResponse({"error": "module and topic are required"}, status=400)

    tag = f"{_normalize_tag_name(module)}|{_normalize_tag_name(topic)}"
    results = []
    applied_count = 0
    failed_count = 0

    for path in raw_paths:
        if not isinstance(path, str) or not _is_valid_vault_path(path):
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


def _query_tokens(text: str) -> List[str]:
    return [token for token in re.split(r"[^a-z0-9]+", text.lower()) if token]


def _line_match_score(query_lower: str, line_lower: str) -> float:
    stripped = line_lower.strip()
    if not stripped:
        return 0.0

    if query_lower in stripped:
        position = stripped.index(query_lower)
        return 1.0 - (position / max(len(stripped), 1)) * 0.05

    tokens = _query_tokens(query_lower)
    if len(tokens) > 1 and all(token in stripped for token in tokens):
        first_position = min(stripped.index(token) for token in tokens)
        return 0.9 - (first_position / max(len(stripped), 1)) * 0.05

    fuzzy_score = _line_fuzzy_score(query_lower, stripped)
    return fuzzy_score if fuzzy_score >= 0.82 else 0.0


def _extract_snippets(
    all_lines: List[str], query_lower: str, context: int = 2
) -> Tuple[float, List[str]]:
    """Return relevance score and up to 3 context blocks around matched lines."""
    matches = [
        (i, _line_match_score(query_lower, line.strip().lower()))
        for i, line in enumerate(all_lines)
        if line.strip()
    ]
    ranked_matches = [match for match in matches if match[1] > 0]
    if not ranked_matches:
        return 0.0, []

    ranked_matches.sort(key=lambda match: (-match[1], match[0]))

    snippets_with_ranges: List[Tuple[int, str]] = []
    used_ranges: List[Tuple[int, int]] = []

    for idx, _ in ranked_matches:
        start = max(0, idx - context)
        end = min(len(all_lines) - 1, idx + context)
        overlaps_existing = any(
            not (end < existing_start or start > existing_end)
            for existing_start, existing_end in used_ranges
        )
        if overlaps_existing:
            continue
        snippets_with_ranges.append(
            (start, "\n".join(line.rstrip() for line in all_lines[start : end + 1]))
        )
        used_ranges.append((start, end))
        if len(snippets_with_ranges) == 3:
            break

    snippets_with_ranges.sort(key=lambda item: item[0])
    return ranked_matches[0][1], [snippet for _, snippet in snippets_with_ranges]


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

        score, snippets = _extract_snippets(content.splitlines(), query_lower)
        if snippets:
            results.append({"name": bare, "snippets": snippets, "score": score})

    results.sort(key=lambda result: (-result["score"], result["name"]))

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

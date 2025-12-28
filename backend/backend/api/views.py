import json
import os
from typing import List

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

        if set(file_tags) == set(tags):
            matched_files.append(path)

    return matched_files


@csrf_exempt
def match_tags_view(request):
    body = json.loads(request.body)
    tags = body.get("tags", [])
    tags = [tag.replace(" ", "") for tag in tags]
    files = match_obsidian_tags(tags)

    return JsonResponse({"files": files})


def get_file_content(file) -> str:
    lines = [line.strip() for line in file.readlines()]

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


@csrf_exempt
def obsidian_file_by_name(request):
    body = json.loads(request.body)
    name = body.get("name")
    print("name: ", name)

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

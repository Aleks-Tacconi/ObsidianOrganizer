from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .models import Note, NoteURL, PrimaryTag, SubTag
from .serializers import (
    NoteSerializer,
    NoteURLSerializer,
    PrimaryTagSerializer,
    SubTagSerializer,
)


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

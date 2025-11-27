from rest_framework import serializers

from .models import Note, NoteURL, PrimaryTag, SubTag


class NoteURLSerializer(serializers.ModelSerializer):
    class Meta:  # pylint: disable=too-few-public-methods
        model = NoteURL
        fields = ["id", "alias", "url"]


class SubTagSerializer(serializers.ModelSerializer):
    class Meta:  # pylint: disable=too-few-public-methods
        model = SubTag
        fields = ["id", "name", "parent"]


class PrimaryTagSerializer(serializers.ModelSerializer):
    subtags = SubTagSerializer(many=True, read_only=True)

    class Meta:  # pylint: disable=too-few-public-methods
        model = PrimaryTag
        fields = ["id", "name", "color", "subtags"]


class NoteSerializer(serializers.ModelSerializer):
    primary_tag = PrimaryTagSerializer(read_only=True)
    primary_tag_id = serializers.PrimaryKeyRelatedField(
        queryset=PrimaryTag.objects.all(),  # pylint: disable=E1101
        source="primary_tag",
        write_only=True,
    )
    subtags = SubTagSerializer(many=True, read_only=True)
    subtags_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=SubTag.objects.all(),  # pylint: disable=E1101
        source="subtags",
        write_only=True,
    )
    urls = NoteURLSerializer(many=True, read_only=True)
    urls_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=NoteURL.objects.all(),  # pylint: disable=E1101
        source="urls",
        write_only=True,
    )

    class Meta:  # pylint: disable=too-few-public-methods
        model = Note
        fields = [
            "id",
            "name",
            "description",
            "date",
            "completed",
            "primary_tag",
            "primary_tag_id",
            "subtags",
            "subtags_ids",
            "urls",
            "urls_ids",
        ]

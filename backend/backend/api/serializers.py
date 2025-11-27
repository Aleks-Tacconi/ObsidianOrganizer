from rest_framework import serializers

from .models import Grade, ModuleInfo, Note, NoteURL, PrimaryTag, Section, SubTag


class NoteURLSerializer(serializers.ModelSerializer):
    class Meta:
        model = NoteURL
        fields = ["id", "alias", "url"]


class SubTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTag
        fields = ["id", "name", "parent"]


class PrimaryTagSerializer(serializers.ModelSerializer):
    subtags = SubTagSerializer(many=True, read_only=True)

    class Meta:
        model = PrimaryTag
        fields = ["id", "name", "color", "subtags"]


class NoteSerializer(serializers.ModelSerializer):
    primary_tag = PrimaryTagSerializer(read_only=True)
    primary_tag_id = serializers.PrimaryKeyRelatedField(
        queryset=PrimaryTag.objects.all(),
        source="primary_tag",
        write_only=True,
    )
    subtags = SubTagSerializer(many=True, read_only=True)
    subtags_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=SubTag.objects.all(),
        source="subtags",
        write_only=True,
    )
    urls = NoteURLSerializer(many=True, read_only=True)
    urls_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=NoteURL.objects.all(),
        source="urls",
        write_only=True,
    )

    section_id = serializers.PrimaryKeyRelatedField(
        queryset=Section.objects.all(),
        source="section",
        write_only=True,
        required=False,
        allow_null=True,
    )
    section = serializers.StringRelatedField(read_only=True)

    class Meta:
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
            "section",
            "section_id",
        ]


class GradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grade
        fields = ["id", "name", "percentage", "scored"]


class SectionSerializer(serializers.ModelSerializer):
    notes = NoteSerializer(many=True, read_only=True)
    subtag = SubTagSerializer(read_only=True)

    class Meta:
        model = Section
        fields = ["id", "subtag", "notes"]


class ModuleInfoSerializer(serializers.ModelSerializer):
    grades = GradeSerializer(many=True, read_only=True)
    sections = SectionSerializer(many=True, read_only=True)

    class Meta:
        model = ModuleInfo
        fields = ["id", "primary_tag", "description", "grades", "sections"]

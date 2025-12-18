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


class GradeSerializer(serializers.ModelSerializer):
    module_info_id = serializers.PrimaryKeyRelatedField(
        queryset=ModuleInfo.objects.all(), source="module_info", write_only=True
    )

    class Meta:
        model = Grade
        fields = ["id", "name", "percentage", "scored", "module_info_id"]


class SectionSerializer(serializers.ModelSerializer):
    notes = serializers.SerializerMethodField()
    subtag = SubTagSerializer(read_only=True)
    subtag_id = serializers.PrimaryKeyRelatedField(
        queryset=SubTag.objects.all(), source="subtag", write_only=True
    )
    module_info_id = serializers.PrimaryKeyRelatedField(
        queryset=ModuleInfo.objects.all(), source="module_info", write_only=True
    )
    median_date = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = ["id", "subtag", "subtag_id", "module_info_id", "notes", "median_date"]

    def get_notes(self, obj):
        notes = Note.objects.filter(
            subtags=obj.subtag, primary_tag=obj.module_info.primary_tag
        ).order_by("date")

        return NoteSerializer(notes, many=True).data

    def get_median_date(self, obj):
        notes = Note.objects.filter(
            subtags=obj.subtag, primary_tag=obj.module_info.primary_tag
        ).order_by("date")

        if not notes:
            return None

        dates = [note.date for note in notes]
        n = len(dates)
        middle = n // 2

        if n % 2 == 1:
            median = dates[middle]
        else:
            delta = dates[middle] - dates[middle - 1]
            median = dates[middle - 1] + delta / 2

        return median


class PrimaryTagSerializer(serializers.ModelSerializer):
    subtags = SubTagSerializer(many=True, read_only=True)

    class Meta:
        model = PrimaryTag
        fields = ["id", "name", "color", "subtags"]


class ModuleInfoSerializer(serializers.ModelSerializer):
    grades = GradeSerializer(many=True, read_only=True)
    sections = SectionSerializer(many=True, read_only=True)
    primary_tag = PrimaryTagSerializer(read_only=True)

    class Meta:
        model = ModuleInfo
        fields = ["primary_tag", "description", "grades", "sections"]


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
        ]

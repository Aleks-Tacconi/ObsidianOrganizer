from django.db.models import Sum
from rest_framework import serializers

from .models import Grade, ModuleInfo, Note, NoteURL, PrimaryTag, Section, SubTag


def _section_notes(obj: Section) -> list[Note]:
    """Return section notes in persisted order with dated fallback."""

    notes = list(
        Note.objects.filter(
            subtags=obj.subtag, primary_tag=obj.module_info.primary_tag
        ).order_by("date", "id")
    )
    order_lookup = {note_id: index for index, note_id in enumerate(obj.note_order)}
    fallback_index = len(order_lookup)

    notes.sort(
        key=lambda note: (
            order_lookup.get(note.id, fallback_index),
            note.date,
            note.id,
        )
    )
    return notes


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

    def validate(self, attrs):
        module_info = attrs.get(
            "module_info", getattr(self.instance, "module_info", None)
        )
        percentage = attrs.get("percentage", getattr(self.instance, "percentage", None))
        scored = attrs.get("scored", getattr(self.instance, "scored", None))
        name = attrs.get("name", getattr(self.instance, "name", ""))

        cleaned_name = str(name).strip()
        if not cleaned_name:
            raise serializers.ValidationError({"name": "Assessment name is required."})

        if percentage is None or not 0 <= percentage <= 100:
            raise serializers.ValidationError(
                {"percentage": "Weight must be between 0 and 100."}
            )

        if scored is None or not 0 <= scored <= 100:
            raise serializers.ValidationError(
                {"scored": "Score must be between 0 and 100."}
            )

        if module_info is not None:
            other_total = (
                module_info.grades.exclude(
                    pk=getattr(self.instance, "pk", None)
                ).aggregate(total=Sum("percentage"))["total"]
                or 0
            )
            if other_total + percentage > 100.000001:
                raise serializers.ValidationError(
                    {
                        "percentage": "Tracked grade weights cannot exceed 100% for a module."
                    }
                )

        attrs["name"] = cleaned_name
        return attrs


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
        return NoteSerializer(_section_notes(obj), many=True).data

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
    note_count = serializers.IntegerField(read_only=True)
    completed_note_count = serializers.IntegerField(read_only=True)
    is_complete = serializers.SerializerMethodField()

    class Meta:
        model = PrimaryTag
        fields = [
            "id",
            "name",
            "color",
            "subtags",
            "note_count",
            "completed_note_count",
            "is_complete",
        ]

    def get_is_complete(self, obj):
        note_count = getattr(obj, "note_count", 0) or 0
        completed_note_count = getattr(obj, "completed_note_count", 0) or 0
        return note_count > 0 and note_count == completed_note_count


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

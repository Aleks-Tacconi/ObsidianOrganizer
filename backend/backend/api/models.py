from django.db import models


class PrimaryTag(models.Model):
    name = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=7)

    def __str__(self) -> str:
        return str(self.name)


class SubTag(models.Model):
    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        PrimaryTag, related_name="subtags", on_delete=models.CASCADE
    )

    def __str__(self) -> str:
        return f"{self.parent.name} > {self.name}"


class NoteURL(models.Model):
    alias = models.CharField(max_length=255)
    url = models.URLField()

    def __str__(self) -> str:
        return f"{self.alias} ({self.url})"


class Note(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    date = models.DateTimeField()
    completed = models.BooleanField(default=False)
    primary_tag = models.ForeignKey(
        PrimaryTag, related_name="notes", on_delete=models.SET_NULL, null=True
    )
    subtags = models.ManyToManyField(SubTag, related_name="notes", blank=True)
    urls = models.ManyToManyField(NoteURL, related_name="notes", blank=True)

    def __str__(self) -> str:
        return str(self.name)

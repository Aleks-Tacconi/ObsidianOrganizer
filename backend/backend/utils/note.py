from datetime import datetime

from . import db

ATTRS = [
    "id",
    "title",
    "identifier_tag",
    "obsidian_link_tags",
    "description",
    "datetime",
    "urls",
]


class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255))
    identifier_tag = db.Column(db.String(50))
    obsidian_link_tags = db.Column(db.String(255))
    description = db.Column(db.String(500))
    datetime = db.Column(db.DateTime, default=datetime.now())
    urls = db.Column(db.JSON)


def ensure_note(attrs: dict) -> Note | None:
    if all(key in attrs for key in ATTRS):
        return Note(*[attrs[i] for i in ATTRS])
    return None

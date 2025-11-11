import json
from datetime import datetime as dt
from typing import List, TypedDict

from flask import Request

from . import db
from .utils import get_data


class NoteProps(TypedDict):
    title: str
    identifier_tag: str
    identifier_color: str
    obsidian_link_tags: List[str]
    description: str
    urls: List[List[str]]
    id: int | None
    datetime: dt | None


class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255))
    identifier_tag = db.Column(db.String(50))
    identifier_color = db.Column(db.String(7))
    obsidian_link_tags = db.Column(db.String(255))
    description = db.Column(db.String(500))
    datetime = db.Column(db.DateTime, default=dt.now())
    urls = db.Column(db.JSON)

    def __init__(self, props: NoteProps) -> None:
        self.title = props.get("title")
        self.identifier_tag = props.get("identifier_tag")
        self.identifier_color = props.get("identifier_color")
        self.obsidian_link_tags = json.dumps(props.get("obsidian_link_tags"))
        self.description = props.get("description")
        self.urls = json.dumps(props.get("urls"))

        datetime = props.get("datetime")

        if datetime is not None:
            self.datetime = datetime

    def as_props(self) -> NoteProps:
        props: NoteProps = {
            "id": int(self.id),
            "title": self.title,
            "identifier_tag": self.identifier_tag,
            "identifier_color": self.identifier_color,
            "obsidian_link_tags": json.loads(self.obsidian_link_tags),
            "description": self.description,
            "datetime": self.datetime,
            "urls": json.loads(self.urls),
        }

        return props

    def __repr__(self) -> str:
        return str(self.as_props())


def create_note(req: Request) -> Note | None:
    data: NoteProps

    if (data := get_data(req)) == {}:  # pyright: ignore
        return None

    return Note(data)

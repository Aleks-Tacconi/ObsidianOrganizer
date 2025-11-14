from flask import Response, jsonify, request
from utils import app, db
from utils.note import Note, create_note


@app.route("/api/set_note", methods=["POST"])
def set_note() -> Response:
    if (note := create_note(request)) is None:
        return jsonify()

    if (old_note := db.session.get(Note, note.id)) is None:
        db.session.add(note)
    else:
        old_note.update(note.as_props())

    db.session.commit()

    return jsonify()

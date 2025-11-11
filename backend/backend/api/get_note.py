from flask import Response, jsonify, request
from utils import app, db
from utils.note import Note
from utils.utils import get_data


@app.route("/api/get_note", methods=["POST"])
def get_note() -> Response:
    if (data := get_data(request)) is None:
        return jsonify()

    if "id" not in data.keys():
        return jsonify()

    if (_id := data.get("id")) and not _id.isdigit():
        return jsonify()

    if (note := db.session.get(Note, _id)) is None:
        return jsonify()

    print(note, flush=True)

    return jsonify({"data": note.as_props()})

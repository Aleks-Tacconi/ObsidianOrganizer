from flask import Response, jsonify, request
from utils import app, db
from utils.note import create_note


@app.route("/api/add_note", methods=["POST"])
def add_note() -> Response:
    if (note := create_note(request)) is None:
        return jsonify()

    db.session.add(note)
    # db.session.commit()

    return jsonify()

from flask import Response, jsonify, request
from utils import app, db
from utils.note import create_note


@app.route("/api/delete_note", methods=["POST"])
def delete_note() -> Response:
    if (note := create_note(request)) is None:
        return jsonify()

    db.session.delete(note)
    # db.session.commit()

    return jsonify()

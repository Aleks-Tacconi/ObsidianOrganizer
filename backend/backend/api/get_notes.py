from flask import jsonify, Response
from utils import app
from utils.note import Note


@app.route("/api/get_notes", methods=["GET"])
def get_notes() -> Response:
    return jsonify({"data": Note.query.all()})

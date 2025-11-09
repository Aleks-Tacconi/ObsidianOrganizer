from flask import Request, Response, jsonify, request
from utils import app, db
from utils.note import Note, ensure_note

with app.app_context():
    db.create_all()
    notes = Note.query.all()


def get_data(req: Request) -> dict:
    json = req.json

    if json is None:
        return {}

    return json.get("data")


def get_note(req: Request) -> Note | None:
    if (data := get_data(req)) == {}:
        return None

    return ensure_note(data)


@app.route("/api/get_notes", methods=["GET"])
def get_notes() -> Response:
    print("testing 123", flush=True)
    return jsonify({"data": notes})


@app.route("/api/add_note", methods=["POST"])
def add_note() -> Response:
    if (note := get_note(request)) is not None:
        return jsonify()

    db.session.add(note)
    db.session.commit()

    return jsonify()


@app.route("/api/delete_note", methods=["POST"])
def delete_note() -> Response:
    if (note := get_note(request)) is not None:
        return jsonify()

    db.session.delete(note)
    db.session.commit()

    return jsonify()


if __name__ == "__main__":
    app.run(debug=True, port=5001)

from datetime import datetime

from api import expose_endpoints
from utils import app, db
from utils.note import Note, NoteProps

with app.app_context():
    db.drop_all()
    db.create_all()

    props: NoteProps = {
        "title": "testing 123",
        "identifier_tag": "identifier tag",
        "identifier_color": "#5555ee",
        "obsidian_link_tags": ["tag1", "tag2"],
        "description": "short description",
        "urls": [["www.example.com", "example.com"], ["google.com", "the google search engine"]],
        "datetime": datetime.now(),
        "id": None,
    }
    note = Note(props)
    db.session.add(note)
    db.session.commit()

    notes = Note.query.all()
    print(f"\n\n{notes=}", flush=True)

expose_endpoints()

if __name__ == "__main__":
    app.run(debug=True, port=5001)

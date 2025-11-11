import type { Note } from "../../../../Utils/types";

import NoteHeader from "./NoteHeader/NoteHeader";
import NoteTags from "./NoteTags/NoteTags";
import NoteDescription from "./NoteDescription/NoteDescription";
import NoteDateTime from "./NoteDateTime/NoteDateTime";
import NoteUrls from "./NoteUrls/NoteUrls";

import "./NoteDisplay.css"

type NoteDisplayProps = {
    note: Note;
};

export default function NoteDisplay({ note }: NoteDisplayProps) {
    return (
        <div className="note-display">
            <NoteHeader title={note.title} />
            <NoteTags tags={note.obsidian_link_tags} identifier_tag={note.identifier_tag} identifier_color={note.identifier_color} />
            <NoteDescription description={note.description} />
            <NoteDateTime date={note.datetime} />
            <NoteUrls urls={note.urls} />
        </div>
    );
}

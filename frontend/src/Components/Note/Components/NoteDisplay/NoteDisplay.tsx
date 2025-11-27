import type { Note } from "../../../../Utils/types";

import NoteHeader from "./NoteHeader/NoteHeader";
import NoteTags from "./NoteTags/NoteTags";
import NoteDescription from "./NoteDescription/NoteDescription";
import NoteDateTime from "./NoteDateTime/NoteDateTime";
import NoteUrls from "./NoteUrls/NoteUrls";

import "./NoteDisplay.css";

type NoteDisplayProps = {
    note: Note;
};

export default function NoteDisplay({ note }: NoteDisplayProps) {
    const identifier_tag = note.primary_tag?.name ?? null;
    const identifier_color = note.primary_tag?.color ?? null;

    const obsidian_link_tags = note.subtags.map((s) => s.name);
    const formatted_urls: [string, string][] = note.urls.map((u) => [u.alias, u.url]);

    return (
        <div className="note-display">
            <NoteHeader title={note.name} />
            <NoteTags tags={obsidian_link_tags} identifier_tag={identifier_tag} identifier_color={identifier_color} />
            <NoteDescription description={note.description} />
            <NoteDateTime date={new Date(note.date)} />
            <NoteUrls urls={formatted_urls} />
        </div>
    );
}

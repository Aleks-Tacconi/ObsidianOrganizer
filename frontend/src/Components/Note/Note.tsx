import { useEffect, useState } from "react";

import { FaPenToSquare, FaTrashCan, FaRegSquare, FaRegSquareCheck } from "react-icons/fa6";

import api from "../../Utils/api";
import type { Note } from "../../Utils/types";

import NoteDisplay from "./Components/NoteDisplay/NoteDisplay";

import "./Note.css";

type NoteProps = {
    id: number;
};

export default function Note({ id }: NoteProps) {
    const [note, setNote] = useState<Note | null>(null);

    useEffect(() => {
        const getNote = async () => {
            const result = await api.get<Note>(`notes/${id}/`);
            if (!result) return;
            setNote(result.data);
        };
        getNote();
    }, [id]);

    const toggleComplete = async () => {
        if (note === null) return;

        const updated = { ...note, completed: !note.completed };
        setNote(updated);

        await api.put(`notes/${id}/`, {
            completed: updated.completed,
            name: updated.name,
            description: updated.description,
            date: updated.date,
            primary_tag_id: updated.primary_tag?.id ?? null,
            subtags_ids: updated.subtags.map((st) => st.id),
            urls_ids: updated.urls.map((u) => u.id),
        });
    };

    return (
        <>
            {note === null ? (
                <></>
            ) : (
                <div className="note-frame">
                    <div className="note-frame-inner">
                        <div className="note-frame-left">
                            <NoteDisplay note={note} />
                        </div>

                        <div className="note-frame-right">
                            <div
                                className="note-frame-icon"
                                onClick={() => {
                                    console.log("@@@");
                                }}
                            >
                                <FaPenToSquare />
                            </div>
                            <div className="note-frame-icon">
                                <FaTrashCan />
                            </div>
                            <div className="note-frame-icon" style={{ transform: "translateY(1px)" }} onClick={toggleComplete}>
                                {note.completed ? <FaRegSquare /> : <FaRegSquareCheck />}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

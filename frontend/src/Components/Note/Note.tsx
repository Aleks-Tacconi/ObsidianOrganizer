import { useEffect, useState } from "react";

import { FaPenToSquare, FaTrashCan, FaRegSquare, FaRegSquareCheck } from "react-icons/fa6";

import api from "../../Utils/api";
import type { Note } from "../../Utils/types";

import NoteDisplay from "./Components/NoteDisplay/NoteDisplay";

import "./Note.css";

type NoteProps = {
    id: string;
};

export default function Note({ id }: NoteProps) {
    const [note, setNote] = useState<Note | null>(null);

    useEffect(() => {
        const getNote = async () => {
            const result = await api.post("get_note", { id });
            setNote(result?.data?.data);
        };
        getNote();
    }, [id]);

    const toggleComplete = () => {
        if (note === null) {
            return;
        }

        setNote({ ...note, complete: !note.complete });

        const postNote = async () => {
            await api.post("set_note", { note });
        };
        postNote();
    };

    return (
        <>
            {note === null ? (
                <></>
            ) : (
                <div className="note-frame">
                    <div className="left">
                        <NoteDisplay note={note} />
                    </div>

                    <div className="right">
                        <div
                            className="icon"
                            onClick={() => {
                                console.log("@@@");
                            }}
                        >
                            <FaPenToSquare />
                        </div>
                        <div className="icon">
                            <FaTrashCan />
                        </div>
                        <div className="icon" style={{ transform: "translateY(1px)" }} onClick={toggleComplete}>
                            {note.complete ? <FaRegSquare /> : <FaRegSquareCheck />}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

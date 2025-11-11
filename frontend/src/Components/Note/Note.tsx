import { useEffect, useState } from "react";

import { FaPenToSquare, FaTrashCan, FaRegSquare } from "react-icons/fa6";

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
            const result = await api.apiPost("get_note", { id });
            setNote(result.data.data);
        };
        getNote();
    }, [id]);

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
                        <div className="icon" style={{transform: "translateY(1px)"}}>
                            <FaRegSquare />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

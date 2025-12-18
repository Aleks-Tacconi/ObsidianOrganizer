import { useEffect, useState } from "react";
import { Card, CardContent, CardActions, IconButton, Stack, Tooltip } from "@mui/material";
import { FaPenToSquare, FaTrashCan, FaRegSquare, FaRegSquareCheck } from "react-icons/fa6";

import api from "../../Utils/api";
import type { Note as NoteType } from "../../Utils/types/api.schemas";
import NoteDisplay from "./Components/NoteDisplay";
import NoteDialog from "../NoteDialogue/NoteDialogue";

type Props = {
    id: number;
    Updated: () => void;
};

export default function Note({ id, Updated }: Props) {
    const [note, setNote] = useState<NoteType | null>(null);
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        api.get<NoteType>(`notes/${id}/`).then((r) => r && setNote(r.data));
    }, [id]);

    const toggleComplete = async () => {
        if (!note) return;

        const updated = { ...note, completed: !note.completed };
        setNote(updated);

        await api.put(`notes/${id}/`, {
            completed: updated.completed,
            name: updated.name,
            description: updated.description,
            date: updated.date,
            primary_tag_id: updated.primary_tag?.id ?? null,
            subtags_ids: updated.subtags.map((s) => s.id),
            urls_ids: updated.urls.map((u) => u.id),
        });
    };

    const handleDelete = async () => {
        await api.del(`notes/${id}/`);
        Updated();
    };

    if (!note) return null;

    return (
        <>
            <Card
                sx={{
                    mb: 2,
                    borderLeft: "2px solid #444",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
                    borderTopLeftRadius: "1px",
                    borderBottomLeftRadius: "1px",
                }}
            >
                <CardContent>
                    <NoteDisplay note={note} />
                </CardContent>

                <CardActions sx={{ justifyContent: "flex-end" }}>
                    <Stack direction="row" spacing={1}>
                        <Tooltip title="Edit">
                            <IconButton onClick={() => setEditing(true)}>
                                <FaPenToSquare />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete">
                            <IconButton onClick={handleDelete}>
                                <FaTrashCan />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title={note.completed ? "Mark as not done" : "Mark as done"}>
                            <IconButton onClick={toggleComplete}>
                                {note.completed ? <FaRegSquareCheck /> : <FaRegSquare />}
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </CardActions>
            </Card>

            <NoteDialog
                open={editing}
                onClose={() => setEditing(false)}
                onSaved={Updated}
                primaryTagId={note.primary_tag?.id ?? 0}
                note={note}
            />
        </>
    );
}

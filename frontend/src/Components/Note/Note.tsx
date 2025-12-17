import { useEffect, useState } from "react";
import { Card, CardContent, CardActions, IconButton, Stack, Tooltip } from "@mui/material";
import { FaPenToSquare, FaTrashCan, FaRegSquare, FaRegSquareCheck } from "react-icons/fa6";

import api from "../../Utils/api";
import type { Note } from "../../Utils/types/api.schemas";
import NoteDisplay from "./Components/NoteDisplay";

type NoteProps = {
    id: number;
    onDelete?: (id: number) => void;
};

export default function Note({ id, onDelete }: NoteProps) {
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
        if (!note) return;

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

    const handleDelete = async () => {
        await api.delete(`notes/${id}/`);
        onDelete?.(id); // notify parent if needed
    };

    const handleEdit = () => {
        // you can open your existing Create/Edit dialog here
        console.log("Edit note", id);
    };

    if (!note) return null;

    return (
        <Card variant="outlined" sx={{ mb: 2, position: "relative", margin: "5px", padding: 0 }}>
            <CardContent>
                <NoteDisplay note={note} />
            </CardContent>

            <CardActions sx={{ justifyContent: "flex-end" }}>
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Edit">
                        <IconButton onClick={handleEdit} size="small">
                            <FaPenToSquare />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <IconButton onClick={handleDelete} size="small">
                            <FaTrashCan />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={note.completed ? "Mark as not done" : "Mark as done"}>
                        <IconButton onClick={toggleComplete} size="small">
                            {note.completed ? <FaRegSquareCheck /> : <FaRegSquare />}
                        </IconButton>
                    </Tooltip>
                </Stack>
            </CardActions>
        </Card>
    );
}

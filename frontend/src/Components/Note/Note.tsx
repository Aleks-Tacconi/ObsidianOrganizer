import { Card, CardContent, CardActions, IconButton, Stack, Tooltip } from "@mui/material";
import { FaPenToSquare, FaTrashCan, FaRegSquare, FaRegSquareCheck } from "react-icons/fa6";

import api from "../../Utils/api";
import type { Note as NoteType } from "../../Utils/types/api.schemas";
import NoteDisplay from "./Components/NoteDisplay";
import NoteDialog from "../NoteDialogue/NoteDialogue";
import { useState } from "react";

type Props = {
  note: NoteType;
  onUpdate: (note: NoteType) => void;
  onDelete: (id: number) => void;
};

export default function Note({ note, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);

  const toggleComplete = async () => {
    const updated = { ...note, completed: !note.completed };
    onUpdate(updated);

    await api.put(`notes/${note.id}/`, {
      ...updated,
      primary_tag_id: updated.primary_tag?.id ?? null,
      subtags_ids: updated.subtags.map((s) => s.id),
      urls_ids: updated.urls.map((u) => u.id),
    });
  };

  const handleDelete = async () => {
    await api.del(`notes/${note.id}/`);
    onDelete(note.id);
  };

  return (
    <>
      <Card sx={{ mb: 2 }}>
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
        primaryTagId={note.primary_tag?.id ?? 0}
        note={note}
        onSaved={onUpdate}
      />
    </>
  );
}

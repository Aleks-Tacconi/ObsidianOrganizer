import { Card, CardContent, CardActions, IconButton, Stack, Tooltip, CircularProgress } from "@mui/material";
import { FaPenToSquare, FaTrashCan, FaCircleCheck, FaRegCircle } from "react-icons/fa6";

import api from "../../Utils/api";
import type { Note as NoteType } from "../../Utils/types/api.schemas";
import NoteDisplay from "./Components/NoteDisplay";
import NoteDialog from "../NoteDialogue/NoteDialogue";
import ConfirmDialogue from "../ConfirmDialogue/ConfirmDialogue";
import { useState } from "react";

type Props = {
  note: NoteType;
  onUpdate: (note: NoteType) => void;
  onDelete: (id: number) => void;
  refresh?: number;
};

export default function Note({ note, onUpdate, onDelete, refresh }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const toggleComplete = async () => {
    if (toggling) return;
    setToggling(true);
    const updated = { ...note, completed: !note.completed };
    onUpdate(updated);

    await api
      .put(`notes/${note.id}/`, {
        ...updated,
        primary_tag_id: updated.primary_tag?.id ?? null,
        subtags_ids: updated.subtags.map((s) => s.id),
        urls_ids: updated.urls.map((u) => u.id),
      })
      .catch(() => {
        // revert optimistic update on failure
        onUpdate(note);
      })
      .finally(() => setToggling(false));
  };

  const handleDelete = async () => {
    setDeleting(true);
    await api
      .del(`notes/${note.id}/`)
      .then(() => {
        onDelete(note.id);
      })
      .catch(() => {
        setDeleting(false);
      });
  };

  return (
    <>
      <Card
        sx={{
          mb: 2,
          opacity: note.completed ? 0.55 : 1,
          transition: "opacity 150ms ease-out",
        }}
      >
        <CardContent>
          <NoteDisplay note={note} />
        </CardContent>

        <CardActions sx={{ justifyContent: "space-between" }}>
          {/* Completion toggle — left side */}
          <Tooltip title={note.completed ? "Mark as incomplete" : "Mark as complete"}>
            <span>
              <IconButton
                onClick={toggleComplete}
                disabled={toggling}
                aria-label={note.completed ? "Mark as incomplete" : "Mark as complete"}
                sx={{
                  color: note.completed ? "#e0e0e0" : "text.secondary",
                  "&:hover": { color: note.completed ? "#c8c8c8" : "#ededed" },
                }}
              >
                {toggling ? (
                  <CircularProgress size={18} color="inherit" />
                ) : note.completed ? (
                  <FaCircleCheck size={18} />
                ) : (
                  <FaRegCircle size={18} />
                )}
              </IconButton>
            </span>
          </Tooltip>

          {/* Edit + Delete — right side */}
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Edit">
              <IconButton onClick={() => setEditing(true)} aria-label="Edit note" size="small">
                <FaPenToSquare size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Delete">
              <span>
                <IconButton
                  onClick={() => setConfirmOpen(true)}
                  aria-label="Delete note"
                  disabled={deleting}
                  size="small"
                >
                  {deleting ? <CircularProgress size={15} color="inherit" /> : <FaTrashCan size={15} />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </CardActions>
      </Card>

      <NoteDialog
        open={editing}
        onClose={() => setEditing(false)}
        primaryTagId={note.primary_tag?.id ?? 0}
        tagColor={note.primary_tag?.color}
        note={note}
        onSaved={onUpdate}
        refresh={refresh}
      />

      <ConfirmDialogue
        open={confirmOpen}
        onConfirm={() => {
          setConfirmOpen(false);
          handleDelete();
        }}
        onDecline={() => setConfirmOpen(false)}
        title={`Delete "${note.name}"`}
        message="This note will be permanently deleted."
        confirmLabel="Delete"
      />
    </>
  );
}

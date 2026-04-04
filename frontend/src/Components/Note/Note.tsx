import { Box, CircularProgress, Divider, IconButton, Stack, Tooltip } from "@mui/material";
import { motion } from "framer-motion";
import { FaPenToSquare, FaTrashCan, FaCircleCheck, FaRegCircle } from "react-icons/fa6";

import api from "../../Utils/api";
import type { Note as NoteType } from "../../Utils/types/api.schemas";
import NoteDisplay from "./Components/NoteDisplay";
import NoteDialog from "../NoteDialogue/NoteDialogue";
import ConfirmDialogue from "../ConfirmDialogue/ConfirmDialogue";
import { useState } from "react";
import { motionTransitions, staggerItem } from "../../Utils/motion";

type Props = {
  note: NoteType;
  onUpdate: (note: NoteType) => void;
  onDelete: (id: number) => void;
  onChanged?: () => void;
  refresh?: number;
};

export default function Note({ note, onUpdate, onDelete, onChanged, refresh }: Props) {
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
      .then(() => {
        onChanged?.();
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
        onChanged?.();
      })
      .catch(() => {
        setDeleting(false);
      });
  };

  return (
    <>
      <Box
        component={motion.article}
        variants={staggerItem}
        layout
        transition={motionTransitions.layout}
        sx={{
          mb: 2,
          px: 2.5,
          py: 2.5,
          borderRadius: "6px",
          border: note.completed ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,255,255,0.07)",
          backgroundColor: note.completed ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.02)",
          transition: "border-color 150ms ease-out, background-color 150ms ease-out",
          "&:hover": {
            borderColor: note.completed ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.1)",
          },
          "&:last-of-type": {
            mb: 0,
          },
        }}
      >
        <Box>
          <NoteDisplay note={note} />
        </Box>

        <Divider sx={{ mt: 2.5, mb: 1.25, borderColor: note.completed ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)" }} />

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          {/* Completion toggle — left side */}
          <Tooltip title={note.completed ? "Mark as incomplete" : "Mark as complete"}>
            <span>
              <IconButton
                onClick={toggleComplete}
                disabled={toggling}
                aria-label={note.completed ? "Mark as incomplete" : "Mark as complete"}
                sx={{
                  color: note.completed ? "#e0e0e0" : "text.secondary",
                  "&:hover": {
                    color: note.completed ? "#c8c8c8" : "#ededed",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  },
                  "&:focus-visible": {
                    outline: "2px solid #e0e0e0",
                    outlineOffset: 2,
                  },
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
              <IconButton
                onClick={() => setEditing(true)}
                aria-label="Edit note"
                size="small"
                sx={{
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.04)" },
                  "&:focus-visible": {
                    outline: "2px solid #e0e0e0",
                    outlineOffset: 2,
                  },
                }}
              >
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
                  sx={{
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.04)" },
                    "&:focus-visible": {
                      outline: "2px solid #e0e0e0",
                      outlineOffset: 2,
                    },
                  }}
                >
                  {deleting ? <CircularProgress size={15} color="inherit" /> : <FaTrashCan size={15} />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      <NoteDialog
        open={editing}
        onClose={() => setEditing(false)}
        primaryTagId={note.primary_tag?.id ?? 0}
        tagColor={note.primary_tag?.color}
        note={note}
        onSaved={(savedNote) => {
          onUpdate(savedNote);
          onChanged?.();
        }}
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

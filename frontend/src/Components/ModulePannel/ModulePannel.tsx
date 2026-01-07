import { useState } from "react";
import { IconButton, Paper, Typography, Stack, Collapse, Container } from "@mui/material";
import { FaPlus, FaAngleRight, FaAngleDown } from "react-icons/fa6";

import Note from "../Note/Note";
import NoteDialog from "../NoteDialogue/NoteDialogue";
import ProgressBar from "./Components/ProgressBar";
import SectionFiles from "./Components/SectionFiles";

import type { PrimaryTag } from "../../Utils/types/api.schemas";
import { useModuleNotes } from "../../Utils/useModuleNotes";

export default function ModulePannel({
  moduleId,
  refresh,
}: {
  moduleId: PrimaryTag;
  refresh: number;
}) {
  const { moduleInfo, updateNote, deleteNote, addOrReplaceNote } = useModuleNotes(
    moduleId,
    refresh,
  );

  const [expandedSections, setExpandedSections] = useState<number[]>([]);
  const [open, setOpen] = useState(false);

  const allNotes = moduleInfo?.sections.flatMap((s) => s.notes) ?? [];

  const toggleSection = (id: number) => {
    setExpandedSections((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  return (
    <div style={{ width: "100vw" }}>
      <IconButton
        onClick={() => setOpen(true)}
        sx={{ position: "fixed", top: 12, right: 12, zIndex: 2000 }}
      >
        <FaPlus />
      </IconButton>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          {moduleInfo?.primary_tag.name}
        </Typography>

        <Typography variant="body1" align="center" gutterBottom>
          {moduleInfo?.description}
        </Typography>

        <ProgressBar Notes={allNotes} />

        <Stack spacing={2} mt={2}>
          {moduleInfo?.sections.map((section) => (
            <Paper
              key={section.id}
              sx={{
                borderRadius: 2,
                p: 1,
                backgroundColor: "white",
              }}
              elevation={1}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ cursor: "pointer", p: 1 }}
                onClick={() => toggleSection(section.id)}
              >
                {expandedSections.includes(section.id) ? <FaAngleDown /> : <FaAngleRight />}
                <Typography variant="h6">{section.subtag.name}</Typography>
              </Stack>

              <Collapse
                in={expandedSections.includes(section.id)}
                sx={{ paddingRight: "30px", paddingBottom: "10px" }}
              >
                <Stack spacing={1} mt={1} ml={4}>
                  {section.notes.map((note) => (
                    <Note key={note.id} note={note} onUpdate={updateNote} onDelete={deleteNote} />
                  ))}
                </Stack>

                <SectionFiles
                  primaryTagName={moduleInfo.primary_tag.name}
                  subtagName={section.subtag.name}
                />
              </Collapse>
            </Paper>
          ))}
        </Stack>
      </Container>

      <NoteDialog
        open={open}
        onClose={() => setOpen(false)}
        primaryTagId={moduleInfo?.primary_tag.id ?? 0}
        onSaved={addOrReplaceNote}
      />
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  IconButton,
  Paper,
  Typography,
  Stack,
  Collapse,
  Container,
  Skeleton,
  Tooltip,
  Box,
} from "@mui/material";
import { FaPlus, FaAngleRight, FaAngleDown } from "react-icons/fa6";

import Note from "../Note/Note";
import NoteDialog from "../NoteDialogue/NoteDialogue";
import ProgressBar from "./Components/ProgressBar";
import SectionFiles from "./Components/SectionFiles";
import Grades from "./Components/Grades";

import type { PrimaryTag } from "../../Utils/types/api.schemas";
import { useModuleNotes } from "../../Utils/useModuleNotes";

export default function ModulePanel({
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

  // Expand first section by default when data first loads
  useEffect(() => {
    if (moduleInfo?.sections.length && expandedSections.length === 0) {
      setExpandedSections([moduleInfo.sections[0].id]);
    }
    // expandedSections intentionally excluded — only run when moduleInfo changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleInfo]);

  const allNotes = moduleInfo?.sections.flatMap((s) => s.notes) ?? [];

  const toggleSection = (id: number) => {
    setExpandedSections((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const loading = moduleInfo === null;

  return (
    <div style={{ width: "100%" }}>
      <Tooltip title="Add note">
        <span>
          <IconButton
            onClick={() => setOpen(true)}
            disabled={loading}
            sx={{ position: "fixed", top: 12, right: 12, zIndex: 2000 }}
            aria-label="Add note"
          >
            <FaPlus />
          </IconButton>
        </span>
      </Tooltip>

      <Container sx={{ mt: 4 }}>
        {loading ? (
          <Stack spacing={2}>
            <Skeleton variant="text" width="40%" height={40} sx={{ mx: "auto" }} />
            <Skeleton variant="text" width="60%" height={24} sx={{ mx: "auto" }} />
            <Skeleton variant="rectangular" height={8} sx={{ borderRadius: "6px" }} />
            <Skeleton variant="rectangular" height={64} sx={{ borderRadius: "6px" }} />
            <Skeleton variant="rectangular" height={64} sx={{ borderRadius: "6px" }} />
          </Stack>
        ) : (
          <>
            <Typography variant="h4" align="center" gutterBottom>
              {moduleInfo?.primary_tag.name}
            </Typography>

            {moduleInfo?.description && (
              <Typography variant="body1" align="center" color="text.secondary" gutterBottom>
                {moduleInfo.description}
              </Typography>
            )}

            <ProgressBar Notes={allNotes} />

            {moduleInfo?.grades && moduleInfo.grades.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Grades moduleInfo={moduleInfo} />
              </Box>
            )}

            <Stack spacing={2} mt={2}>
              {moduleInfo?.sections.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                  No sections yet. Add a note to get started.
                </Typography>
              ) : (
                moduleInfo?.sections.map((section) => (
                  <Paper
                    key={section.id}
                    sx={{ borderRadius: "6px", p: 1 }}
                    elevation={0}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ cursor: "pointer", p: 1, userSelect: "none" }}
                      onClick={() => toggleSection(section.id)}
                    >
                      {expandedSections.includes(section.id) ? (
                        <FaAngleDown size={12} />
                      ) : (
                        <FaAngleRight size={12} />
                      )}
                      <Typography variant="h6">{section.subtag.name}</Typography>
                    </Stack>

                    <Collapse
                      in={expandedSections.includes(section.id)}
                      sx={{ paddingRight: "32px", paddingBottom: "8px" }}
                    >
                      <Stack direction="row" spacing={3} mt={1} ml={4} alignItems="flex-start">
                        <Stack sx={{ width: "75%" }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Lectures
                          </Typography>
                          {section.notes.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                              No lectures in this section.
                            </Typography>
                          ) : (
                            section.notes.map((note) => (
                              <Note
                                key={note.id}
                                note={note}
                                onUpdate={updateNote}
                                onDelete={deleteNote}
                              />
                            ))
                          )}
                        </Stack>

                        <Stack sx={{ width: "25%" }} spacing={1}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Notes
                          </Typography>
                          <SectionFiles
                            primaryTagName={moduleInfo.primary_tag.name}
                            subtagName={section.subtag.name}
                          />
                        </Stack>
                      </Stack>
                    </Collapse>
                  </Paper>
                ))
              )}
            </Stack>
          </>
        )}
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

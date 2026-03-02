import { useEffect, useState } from "react";
import {
  IconButton,
  Paper,
  Typography,
  Stack,
  Collapse,
  Divider,
  Skeleton,
  Tooltip,
  Box,
} from "@mui/material";
import { FaPlus, FaAngleRight, FaAngleDown, FaGraduationCap, FaFolder, FaFolderOpen, FaNoteSticky } from "react-icons/fa6";

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
            sx={{ position: "fixed", top: 16, right: 16, zIndex: 2000 }}
            aria-label="Add note"
          >
            <FaPlus size={16} />
          </IconButton>
        </span>
      </Tooltip>

      <Box sx={{ mt: 6, px: { xs: 0, sm: 2 } }}>
        {loading ? (
          <Stack spacing={3} sx={{ maxWidth: 720, mx: "auto" }}>
            <Skeleton variant="text" width="45%" height={48} sx={{ mx: "auto" }} />
            <Skeleton variant="text" width="55%" height={22} sx={{ mx: "auto" }} />
            <Skeleton variant="rectangular" height={8} sx={{ borderRadius: "6px" }} />
            <Skeleton variant="rectangular" height={96} sx={{ borderRadius: "6px" }} />
            <Skeleton variant="rectangular" height={96} sx={{ borderRadius: "6px" }} />
          </Stack>
        ) : (
          <>
            {/* Module header */}
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5} sx={{ mb: 1 }}>
                <FaGraduationCap size={22} style={{ color: moduleInfo?.primary_tag.color }} />
                <Typography variant="h4">
                  {moduleInfo?.primary_tag.name}
                </Typography>
              </Stack>
              {moduleInfo?.description && (
                <Typography variant="body1" color="text.secondary">
                  {moduleInfo.description}
                </Typography>
              )}
            </Box>

            {/* Progress */}
            <Box sx={{ mb: 4 }}>
              <ProgressBar Notes={allNotes} color={moduleInfo?.primary_tag.color} />
            </Box>

            {/* Grades */}
            {moduleInfo?.grades && moduleInfo.grades.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Grades moduleInfo={moduleInfo} />
              </Box>
            )}

            {/* Sections */}
            <Stack spacing={2}>
              {moduleInfo?.sections.length === 0 ? (
                <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
                  <FaFolderOpen size={32} style={{ color: "#6b6b6b" }} />
                  <Typography variant="body1" color="text.secondary">
                    No sections yet. Add a note to get started.
                  </Typography>
                </Stack>
              ) : (
                moduleInfo?.sections.map((section) => {
                  const isExpanded = expandedSections.includes(section.id);
                  return (
                    <Paper
                      key={section.id}
                      sx={{ borderRadius: "6px" }}
                      elevation={0}
                    >
                      {/* Section header — clickable */}
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        sx={{
                          cursor: "pointer",
                          px: 3,
                          py: 2,
                          userSelect: "none",
                          "&:hover": { backgroundColor: "rgba(255,255,255,0.02)" },
                          borderRadius: isExpanded ? "6px 6px 0 0" : "6px",
                          transition: "background-color 150ms ease-out",
                        }}
                        onClick={() => toggleSection(section.id)}
                      >
                        <Box sx={{ color: "text.secondary", display: "flex", alignItems: "center" }}>
                          {isExpanded ? <FaAngleDown size={14} /> : <FaAngleRight size={14} />}
                        </Box>
                        <FaFolder size={14} style={{ color: moduleInfo?.primary_tag.color }} />
                        <Typography variant="h6" sx={{ flex: 1 }}>
                          {section.subtag.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {section.notes.length} {section.notes.length === 1 ? "lecture" : "lectures"}
                        </Typography>
                      </Stack>

                      <Collapse in={isExpanded}>
                        <Divider />
                        <Box sx={{ px: 3, pt: 3, pb: 3 }}>
                          <Stack direction="row" spacing={4} alignItems="flex-start">
                            {/* Lectures column */}
                            <Box sx={{ flex: "1 1 0", minWidth: 0 }}>
                              <Typography
                                variant="subtitle2"
                                color="text.secondary"
                                sx={{ mb: 2 }}
                              >
                                Lectures
                              </Typography>
                              {section.notes.length === 0 ? (
                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 3 }}>
                                  <FaNoteSticky size={16} style={{ color: "#6b6b6b", flexShrink: 0 }} />
                                  <Typography variant="body2" color="text.secondary">
                                    No lectures in this section.
                                  </Typography>
                                </Stack>
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
                            </Box>

                            {/* Notes / files column */}
                            <Box sx={{ width: 200, flexShrink: 0 }}>
                              <Typography
                                variant="subtitle2"
                                color="text.secondary"
                                sx={{ mb: 2 }}
                              >
                                Notes
                              </Typography>
                              <SectionFiles
                                primaryTagName={moduleInfo.primary_tag.name}
                                subtagName={section.subtag.name}
                              />
                            </Box>
                          </Stack>
                        </Box>
                      </Collapse>
                    </Paper>
                  );
                })
              )}
            </Stack>
          </>
        )}
      </Box>

      <NoteDialog
        open={open}
        onClose={() => setOpen(false)}
        primaryTagId={moduleInfo?.primary_tag.id ?? 0}
        tagColor={moduleInfo?.primary_tag.color}
        onSaved={addOrReplaceNote}
      />
    </div>
  );
}

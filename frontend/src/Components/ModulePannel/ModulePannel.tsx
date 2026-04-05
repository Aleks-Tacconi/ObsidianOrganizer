import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Chip,
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  FaBars,
  FaBookOpen,
  FaCheck,
  FaFolder,
  FaMagnifyingGlass,
  FaPenToSquare,
  FaPlus,
  FaRegFileLines,
  FaTrashCan,
  FaXmark,
} from "react-icons/fa6";

import ConfirmDialogue from "../ConfirmDialogue/ConfirmDialogue";
import Note from "../Note/Note";
import NoteDialog from "../NoteDialogue/NoteDialogue";
import PageHeaderCard from "../Layout/PageHeaderCard";
import Grades, { type GradeFormValues } from "./Components/Grades";
import ProgressBar from "./Components/ProgressBar";
import SectionFiles from "./Components/SectionFiles";
import ObsidianFileDialog, { type ObsidianFileDialogHandle } from "./Components/ObsidianFileDialog";
import api from "../../Utils/api";
import { motionTransitions, staggerContainer, staggerItem } from "../../Utils/motion";

import type { Note as NoteType, PrimaryTag } from "../../Utils/types/api.schemas";
import { type RuntimeGrade, useModuleNotes } from "../../Utils/useModuleNotes";

function readStoredNumber(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

function matchesNoteQuery(note: NoteType, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const searchableText = [
    note.name,
    note.description ?? "",
    ...note.urls.map((url) => `${url.alias} ${url.url}`),
  ].join("\n").toLowerCase();

  return searchableText.includes(normalized);
}

function moveItem<T extends { id: number }>(items: readonly T[], draggedId: number, targetId: number): T[] {
  const sourceIndex = items.findIndex((item) => item.id === draggedId);
  const targetIndex = items.findIndex((item) => item.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return [...items];
  }

  const nextItems = [...items];
  const [draggedItem] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, draggedItem);
  return nextItems;
}

export default function ModulePanel({
  moduleId,
  refresh,
  onNotesChanged,
}: {
  moduleId: PrimaryTag;
  refresh: number;
  onNotesChanged?: () => void;
}) {
  const {
    moduleInfo,
    updateNote,
    deleteNote,
    addOrReplaceNote,
    addOrReplaceGrade,
    deleteGrade,
    updateSectionName,
    reorderSections,
    reorderSectionNotes,
  } = useModuleNotes(
    moduleId,
    refresh,
  );

  const activeSectionKey = `module-panel:active-section:${moduleId.id}`;
  const [activeSectionId, setActiveSectionId] = useState<number | null>(() => readStoredNumber(activeSectionKey));
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [treeQuery, setTreeQuery] = useState("");
  const [sectionQueries, setSectionQueries] = useState<Record<number, string>>({});
  const [sectionSnippets, setSectionSnippets] = useState<Record<number, boolean>>({});
  const [open, setOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [moduleActionError, setModuleActionError] = useState<string | null>(null);
  const [renameSectionOpen, setRenameSectionOpen] = useState(false);
  const [renameSectionValue, setRenameSectionValue] = useState("");
  const [renameSectionError, setRenameSectionError] = useState<string | null>(null);
  const [renameSectionSubmitting, setRenameSectionSubmitting] = useState(false);
  const [reorderingSections, setReorderingSections] = useState(false);
  const [draggedSectionId, setDraggedSectionId] = useState<number | null>(null);
  const [sectionDropTargetId, setSectionDropTargetId] = useState<number | null>(null);
  const [reorderingNotes, setReorderingNotes] = useState(false);
  const [draggedNoteId, setDraggedNoteId] = useState<number | null>(null);
  const [noteDropTargetId, setNoteDropTargetId] = useState<number | null>(null);
  const [confirmCategoryDeleteOpen, setConfirmCategoryDeleteOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [pendingCategorySubtagId, setPendingCategorySubtagId] = useState<number | null>(null);
  const [searchFileOpen, setSearchFileOpen] = useState(false);
  const [searchActiveFile, setSearchActiveFile] = useState<{ name: string; content: string } | null>(null);
  const [lastNote, setLastNote] = useState<string | null>(() => localStorage.getItem("obsidian-last-note"));
  const searchDialogRef = useRef<ObsidianFileDialogHandle>(null);

  const allSections = useMemo(() => moduleInfo?.sections ?? [], [moduleInfo]);
  const allNotes = useMemo(() => allSections.flatMap((section) => section.notes), [allSections]);
  const normalizedTreeQuery = treeQuery.trim().toLowerCase();
  const visibleSections = useMemo(
    () => allSections.filter((section) => (
      !normalizedTreeQuery
      || section.subtag.name.toLowerCase().includes(normalizedTreeQuery)
      || section.notes.some((note) => matchesNoteQuery(note, normalizedTreeQuery))
    )),
    [allSections, normalizedTreeQuery],
  );

  useEffect(() => {
    if (allSections.length === 0) {
      setActiveSectionId(null);
      return;
    }

    setActiveSectionId((current) => {
      if (current && allSections.some((section) => section.id === current)) {
        return current;
      }

      const stored = readStoredNumber(activeSectionKey);
      if (stored && allSections.some((section) => section.id === stored)) {
        return stored;
      }

      return allSections[0].id;
    });
  }, [activeSectionKey, allSections]);

  useEffect(() => {
    if (activeSectionId === null) return;
    localStorage.setItem(activeSectionKey, String(activeSectionId));
  }, [activeSectionId, activeSectionKey]);

  useEffect(() => {
    if (!normalizedTreeQuery || visibleSections.length === 0) return;
    if (!visibleSections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(visibleSections[0].id);
    }
  }, [activeSectionId, normalizedTreeQuery, visibleSections]);

  useEffect(() => {
    if (pendingCategorySubtagId === null || allSections.length === 0) return;

    const matchingSection = allSections.find((section) => section.subtag.id === pendingCategorySubtagId);
    if (!matchingSection) return;

    setActiveSectionId(matchingSection.id);
    setPendingCategorySubtagId(null);
  }, [allSections, pendingCategorySubtagId]);

  const activeSection = allSections.find((section) => section.id === activeSectionId) ?? null;
  const activeSectionQuery = activeSection ? sectionQueries[activeSection.id] ?? "" : "";
  const activeSectionSnippets = activeSection ? sectionSnippets[activeSection.id] ?? false : false;
  const filteredNotes = useMemo(
    () => activeSection?.notes.filter((note) => matchesNoteQuery(note, activeSectionQuery)) ?? [],
    [activeSection, activeSectionQuery],
  );
  const canReorderSections = normalizedTreeQuery.length === 0 && !renameSectionOpen;
  const canReorderNotes = activeSection !== null && activeSectionQuery.trim().length === 0 && !renameSectionOpen;

  useEffect(() => {
    if (filteredNotes.length === 0) {
      setActiveNoteId(null);
      return;
    }

    if (!filteredNotes.some((note) => note.id === activeNoteId)) {
      setActiveNoteId(filteredNotes[0].id);
    }
  }, [activeNoteId, filteredNotes]);

  useEffect(() => {
    if (!renameSectionOpen || !activeSection) return;

    setRenameSectionValue(activeSection.subtag.name);
  }, [activeSection, renameSectionOpen]);

  const openSearchFile = (name: string) => {
    api
      .post<{ name: string; content: string }>("obsidian-file-by-name/", { name })
      .then((res) => {
        if (res?.data) {
          setSearchActiveFile(res.data);
          setSearchFileOpen(true);
          searchDialogRef.current?.navigate(res.data);
          setLastNote(name);
          localStorage.setItem("obsidian-last-note", name);
        }
      })
      .catch(() => {/* silently ignore */});
  };

  const setActiveSectionQuery = (value: string) => {
    if (!activeSection) return;
    setSectionQueries((prev) => ({
      ...prev,
      [activeSection.id]: value,
    }));
  };

  const toggleSectionPreview = () => {
    if (!activeSection) return;
    setSectionSnippets((prev) => ({
      ...prev,
      [activeSection.id]: !(prev[activeSection.id] ?? false),
    }));
  };

  const focusNote = (noteId: number) => {
    setActiveNoteId(noteId);
    requestAnimationFrame(() => {
      document.getElementById(`module-note-${noteId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCategoryError("Category name is required.");
      return;
    }

    if (moduleInfo?.sections.some((section) => section.subtag.name.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryError("A category with that name already exists in this module.");
      return;
    }

    setCategorySubmitting(true);
    setCategoryError(null);

    try {
      const response = await api.post<{ id: number; name: string; parent: number }>("subtags/", {
        name: trimmed,
        parent: moduleId.id,
      });

      if (response?.data) {
        setPendingCategorySubtagId(response.data.id);
        setNewCategoryName("");
        setCategoryDialogOpen(false);
        onNotesChanged?.();
      }
    } catch {
      setCategoryError("Failed to create category. Please try again.");
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!activeSection) return;

    setDeletingCategory(true);
    setModuleActionError(null);

    try {
      await api.del(`subtags/${activeSection.subtag.id}/`);
      setActiveNoteId(null);
      onNotesChanged?.();
    } catch {
      setModuleActionError("Failed to delete category. Please try again.");
    } finally {
      setDeletingCategory(false);
    }
  };

  const startRenameSection = () => {
    if (!activeSection) return;

    setRenameSectionOpen(true);
    setRenameSectionValue(activeSection.subtag.name);
    setRenameSectionError(null);
  };

  const cancelRenameSection = () => {
    setRenameSectionOpen(false);
    setRenameSectionValue(activeSection?.subtag.name ?? "");
    setRenameSectionError(null);
  };

  const handleRenameSection = async () => {
    if (!activeSection || renameSectionSubmitting) return;

    const trimmed = renameSectionValue.trim();
    if (!trimmed) {
      setRenameSectionError("Category name is required.");
      return;
    }

    const duplicateName = allSections.some((section) => (
      section.id !== activeSection.id
      && section.subtag.name.toLowerCase() === trimmed.toLowerCase()
    ));
    if (duplicateName) {
      setRenameSectionError("A category with that name already exists in this module.");
      return;
    }

    if (trimmed === activeSection.subtag.name) {
      setRenameSectionOpen(false);
      setRenameSectionError(null);
      return;
    }

    setRenameSectionSubmitting(true);
    setRenameSectionError(null);
    setModuleActionError(null);

    try {
      const response = await api.patch<{ id: number; name: string; parent: number }>(
        `subtags/${activeSection.subtag.id}/`,
        { name: trimmed },
      );

      if (!response?.data) {
        throw new Error("Missing rename response");
      }

      updateSectionName(activeSection.id, response.data.name);
      setRenameSectionOpen(false);
    } catch {
      setRenameSectionError("Failed to rename category. Please try again.");
    } finally {
      setRenameSectionSubmitting(false);
    }
  };

  const resetSectionDrag = () => {
    setDraggedSectionId(null);
    setSectionDropTargetId(null);
  };

  const handleSectionDrop = async (targetSectionId: number) => {
    if (!moduleInfo || !canReorderSections || draggedSectionId === null) {
      resetSectionDrag();
      return;
    }

    if (draggedSectionId === targetSectionId) {
      resetSectionDrag();
      return;
    }

    const previousSectionIds = allSections.map((section) => section.id);
    const nextSectionIds = moveItem(allSections, draggedSectionId, targetSectionId).map((section) => section.id);

    reorderSections(nextSectionIds);
    setReorderingSections(true);
    setModuleActionError(null);

    try {
      const response = await api.post<{ updated: number }>("sections/reorder/", {
        module_info_id: moduleInfo.primary_tag.id,
        section_ids: nextSectionIds,
      });

      if (!response?.data) {
        throw new Error("Missing section reorder response");
      }
    } catch {
      reorderSections(previousSectionIds);
      setModuleActionError("Failed to reorder categories. Please try again.");
    } finally {
      setReorderingSections(false);
      resetSectionDrag();
    }
  };

  const resetNoteDrag = () => {
    setDraggedNoteId(null);
    setNoteDropTargetId(null);
  };

  const handleNoteDrop = async (targetNoteId: number) => {
    if (!activeSection || !canReorderNotes || draggedNoteId === null) {
      resetNoteDrag();
      return;
    }

    if (draggedNoteId === targetNoteId) {
      resetNoteDrag();
      return;
    }

    const previousNoteIds = activeSection.notes.map((note) => note.id);
    const nextNoteIds = moveItem(activeSection.notes, draggedNoteId, targetNoteId).map((note) => note.id);

    reorderSectionNotes(activeSection.id, nextNoteIds);
    setReorderingNotes(true);
    setModuleActionError(null);

    try {
      const response = await api.post<{ updated: number }>(`sections/${activeSection.id}/reorder-notes/`, {
        note_ids: nextNoteIds,
      });

      if (!response?.data) {
        throw new Error("Missing note reorder response");
      }
    } catch {
      reorderSectionNotes(activeSection.id, previousNoteIds);
      setModuleActionError("Failed to reorder lectures. Please try again.");
    } finally {
      setReorderingNotes(false);
      resetNoteDrag();
    }
  };

  const handleSaveGrade = async (gradeId: number | null, values: GradeFormValues) => {
    if (!moduleInfo) {
      throw new Error("Module details are still loading.");
    }

    const payload = {
      ...values,
      module_info_id: moduleInfo.primary_tag.id,
    };

    const response = gradeId === null
      ? await api.post<RuntimeGrade>("grades/", payload)
      : await api.put<RuntimeGrade>(`grades/${gradeId}/`, payload);

    if (!response?.data) {
      throw new Error(gradeId === null ? "Failed to add grade. Please try again." : "Failed to update grade. Please try again.");
    }

    addOrReplaceGrade(response.data);
  };

  const handleDeleteGrade = async (gradeId: number) => {
    const response = await api.del(`grades/${gradeId}/`);

    if (response === undefined) {
      throw new Error("Failed to delete grade. Please try again.");
    }

    deleteGrade(gradeId);
  };

  const loading = moduleInfo === null;

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ px: { xs: 0, sm: 2 } }}>
        {loading ? (
          <Stack spacing={3} sx={{ width: "100%" }}>
            <Skeleton variant="rectangular" height={168} sx={{ borderRadius: "6px" }} />
            <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", xl: "320px minmax(0, 1.8fr) 360px" } }}>
              <Skeleton variant="rectangular" height={520} sx={{ borderRadius: "6px" }} />
              <Skeleton variant="rectangular" height={520} sx={{ borderRadius: "6px" }} />
              <Skeleton variant="rectangular" height={520} sx={{ borderRadius: "6px" }} />
            </Box>
          </Stack>
        ) : (
          <Stack spacing={3} sx={{ width: "100%" }}>
            {moduleActionError && (
              <Alert severity="error" onClose={() => setModuleActionError(null)}>
                {moduleActionError}
              </Alert>
            )}

            <Box
              component={motion.section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={motionTransitions.dialog}
            >
              <PageHeaderCard
                icon={null}
                title={moduleInfo?.primary_tag.name ?? ""}
                description={moduleInfo?.description}
                actions={(
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: "flex-start", md: "flex-end" }}>
                    <Tooltip title={lastNote ? `Open: ${lastNote}` : "No recently opened note"}>
                      <span>
                        <IconButton
                          onClick={() => { if (lastNote) openSearchFile(lastNote); }}
                          disabled={!lastNote}
                          aria-label="Open last note"
                        >
                          <FaBookOpen size={16} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Add note">
                      <span>
                        <IconButton
                          onClick={() => setOpen(true)}
                          aria-label="Add note"
                        >
                          <FaPlus size={16} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={() => {
                        setCategoryError(null);
                        setNewCategoryName("");
                        setCategoryDialogOpen(true);
                      }}
                      sx={{ textTransform: "none" }}
                    >
                      Add category
                    </Button>
                  </Stack>
                )}
              >
                <Stack
                  spacing={3}
                >
                  <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                    <Box sx={{ minWidth: 180 }}>
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.75 }}>
                        <FaBookOpen size={15} style={{ color: moduleInfo?.primary_tag.color }} />
                        <Typography variant="subtitle2" color="text.secondary" sx={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
                          Overview
                        </Typography>
                      </Stack>
                      <Stack spacing={0.5}>
                        <Typography variant="body2">{moduleInfo.sections.length} sections</Typography>
                        <Typography variant="body2">{allNotes.length} lectures</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {moduleInfo.grades.length} grades
                        </Typography>
                      </Stack>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <ProgressBar Notes={allNotes} color={moduleInfo?.primary_tag.color} />
                    </Box>
                  </Stack>

                  <Divider />

                  <Box>
                    <Grades
                      moduleInfo={moduleInfo}
                      embedded
                      onSaveGrade={handleSaveGrade}
                      onDeleteGrade={handleDeleteGrade}
                    />
                  </Box>
                </Stack>
              </PageHeaderCard>
            </Box>

            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: { xs: "1fr", xl: "320px minmax(0, 1.9fr) 360px" },
                alignItems: "start",
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.07)",
                  backgroundColor: "#141414",
                  position: { xl: "sticky" },
                  top: { xl: 88 },
                }}
              >
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Sections
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      Browse one section at a time with a cleaner explorer layout.
                    </Typography>
                  </Box>

                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Filter sections…"
                    value={treeQuery}
                    onChange={(event) => setTreeQuery(event.target.value)}
                    inputProps={{ "aria-label": "Filter sections" }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FaMagnifyingGlass size={13} style={{ color: "#6b6b6b" }} />
                        </InputAdornment>
                      ),
                      endAdornment: treeQuery ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setTreeQuery("")}
                            aria-label="Clear section filter"
                            sx={{ padding: "4px" }}
                          >
                            <FaXmark size={12} />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }}
                  />

                  {normalizedTreeQuery.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      Clear the section filter to reorder categories.
                    </Typography>
                  )}

                  {visibleSections.length === 0 ? (
                    <Stack spacing={1} alignItems="flex-start" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        No sections match that filter.
                      </Typography>
                    </Stack>
                  ) : (
                    <List
                      dense
                      disablePadding
                      component={motion.div}
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                    >
                      {visibleSections.map((section) => {
                        const sectionIsActive = section.id === activeSectionId;
                        const sectionNotes = sectionIsActive
                          ? section.notes.filter((note) => matchesNoteQuery(note, activeSectionQuery))
                          : section.notes;

                        return (
                          <Box key={section.id} component={motion.div} variants={staggerItem}>
                            <ListItemButton
                              selected={sectionIsActive}
                              onClick={() => setActiveSectionId(section.id)}
                              draggable={canReorderSections && !reorderingSections}
                              onDragStart={(event) => {
                                if (!canReorderSections || reorderingSections) return;
                                event.dataTransfer.effectAllowed = "move";
                                setDraggedSectionId(section.id);
                                setSectionDropTargetId(section.id);
                              }}
                              onDragOver={(event) => {
                                if (!canReorderSections || draggedSectionId === null) return;
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                                if (sectionDropTargetId !== section.id) {
                                  setSectionDropTargetId(section.id);
                                }
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                void handleSectionDrop(section.id);
                              }}
                              onDragEnd={resetSectionDrag}
                              sx={{
                                borderRadius: "6px",
                                alignItems: "center",
                                px: 1.25,
                                py: 1.125,
                                gap: 1,
                                opacity: draggedSectionId === section.id ? 0.55 : 1,
                                transition: "background-color 150ms ease-out",
                                border: sectionDropTargetId === section.id && draggedSectionId !== section.id
                                  ? "1px dashed rgba(255,255,255,0.18)"
                                  : "1px solid transparent",
                                "&:hover": {
                                  backgroundColor: "rgba(255,255,255,0.03)",
                                },
                                "&.Mui-selected": {
                                  backgroundColor: "transparent",
                                },
                                "&.Mui-selected:hover": {
                                  backgroundColor: "rgba(255,255,255,0.03)",
                                },
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 24, color: moduleInfo.primary_tag.color }}>
                                <FaFolder size={13} />
                              </ListItemIcon>
                              <ListItemText
                                primary={section.subtag.name}
                                secondary={`${section.notes.length} lecture${section.notes.length === 1 ? "" : "s"}`}
                                primaryTypographyProps={{
                                  fontWeight: sectionIsActive ? 600 : 500,
                                  fontSize: "0.95rem",
                                  color: "text.primary",
                                }}
                                secondaryTypographyProps={{ fontSize: "0.75rem", color: "text.secondary" }}
                              />
                              {canReorderSections && (
                                <Box sx={{ color: "text.secondary", display: "flex", alignItems: "center" }}>
                                  <FaBars size={11} />
                                </Box>
                              )}
                            </ListItemButton>

                            <AnimatePresence initial={false}>
                              {sectionIsActive && sectionNotes.length > 0 && (
                                <Box
                                  component={motion.div}
                                  key={`section-notes-${section.id}`}
                                  initial={{ opacity: 0, height: 0, y: -4 }}
                                  animate={{ opacity: 1, height: "auto", y: 0 }}
                                  exit={{ opacity: 0, height: 0, y: -4 }}
                                  transition={motionTransitions.base}
                                  sx={{ overflow: "hidden" }}
                                >
                                  <List
                                    disablePadding
                                    sx={{
                                      mt: 0.75,
                                      ml: 1.5,
                                      pl: 1.25,
                                      borderLeft: "1px solid rgba(255,255,255,0.05)",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 0.25,
                                    }}
                                  >
                                    {sectionNotes.map((note) => (
                                      <ListItemButton
                                        key={note.id}
                                        selected={note.id === activeNoteId}
                                        onClick={() => focusNote(note.id)}
                                        draggable={canReorderNotes && !reorderingNotes}
                                        onDragStart={(event) => {
                                          if (!canReorderNotes || reorderingNotes) return;
                                          event.dataTransfer.effectAllowed = "move";
                                          setDraggedNoteId(note.id);
                                          setNoteDropTargetId(note.id);
                                        }}
                                        onDragOver={(event) => {
                                          if (!canReorderNotes || draggedNoteId === null) return;
                                          event.preventDefault();
                                          event.dataTransfer.dropEffect = "move";
                                          if (noteDropTargetId !== note.id) {
                                            setNoteDropTargetId(note.id);
                                          }
                                        }}
                                        onDrop={(event) => {
                                          event.preventDefault();
                                          void handleNoteDrop(note.id);
                                        }}
                                        onDragEnd={resetNoteDrag}
                                        sx={{
                                          minHeight: 34,
                                          borderRadius: "6px",
                                          px: 1.25,
                                          py: 0.625,
                                          position: "relative",
                                          color: note.id === activeNoteId ? "text.primary" : "text.secondary",
                                          opacity: draggedNoteId === note.id ? 0.55 : 1,
                                          transition: "background-color 150ms ease-out, color 150ms ease-out",
                                          border: noteDropTargetId === note.id && draggedNoteId !== note.id
                                            ? "1px dashed rgba(255,255,255,0.18)"
                                            : "1px solid transparent",
                                          "&:hover": {
                                            backgroundColor: "rgba(255,255,255,0.03)",
                                            color: "text.primary",
                                          },
                                          "&::before": {
                                            content: '""',
                                            position: "absolute",
                                            left: 0,
                                            top: 7,
                                            bottom: 7,
                                            width: 2,
                                            borderRadius: "999px",
                                            backgroundColor: note.id === activeNoteId ? moduleInfo.primary_tag.color : "transparent",
                                          },
                                          "&.Mui-selected": {
                                            backgroundColor: "rgba(255,255,255,0.04)",
                                            color: "text.primary",
                                          },
                                          "&.Mui-selected:hover": {
                                            backgroundColor: "rgba(255,255,255,0.05)",
                                          },
                                        }}
                                        >
                                          <ListItemIcon sx={{ minWidth: 22, color: "inherit" }}>
                                            <FaRegFileLines size={12} />
                                          </ListItemIcon>
                                          <ListItemText
                                          primary={note.name}
                                          primaryTypographyProps={{
                                            fontSize: "0.8125rem",
                                            fontWeight: note.id === activeNoteId ? 500 : 400,
                                            lineHeight: 1.35,
                                            color: "inherit",
                                              sx: { overflowWrap: "anywhere" },
                                            }}
                                          />
                                          {canReorderNotes && (
                                            <Box sx={{ display: "flex", alignItems: "center", color: "inherit" }}>
                                              <FaBars size={10} />
                                            </Box>
                                          )}
                                        </ListItemButton>
                                      ))}
                                    </List>
                                </Box>
                              )}
                            </AnimatePresence>
                          </Box>
                        );
                      })}
                    </List>
                  )}
                </Stack>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, md: 2.5 },
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.07)",
                  backgroundColor: "#141414",
                  minHeight: 520,
                }}
              >
                {visibleSections.length === 0 ? (
                  <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: 420 }}>
                    <Typography variant="h6">No Matching Sections</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Try a broader filter in the section explorer.
                    </Typography>
                  </Stack>
                ) : activeSection ? (
                  <AnimatePresence mode="wait" initial={false}>
                    <Box
                      key={`workspace-${activeSection.id}`}
                      component={motion.div}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={motionTransitions.base}
                    >
                      <Stack spacing={3}>
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", md: "flex-start" }}
                          spacing={1.5}
                        >
                          <Stack spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
                            {renameSectionOpen ? (
                              <Stack spacing={1} sx={{ width: "100%", maxWidth: 360 }}>
                                <TextField
                                  value={renameSectionValue}
                                  onChange={(event) => {
                                    setRenameSectionValue(event.target.value);
                                    if (renameSectionError) setRenameSectionError(null);
                                  }}
                                  autoFocus
                                  size="small"
                                  fullWidth
                                  placeholder="Rename category"
                                  disabled={renameSectionSubmitting}
                                  error={Boolean(renameSectionError)}
                                  helperText={renameSectionError}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      void handleRenameSection();
                                    }

                                    if (event.key === "Escape") {
                                      event.preventDefault();
                                      cancelRenameSection();
                                    }
                                  }}
                                />
                                <Stack direction="row" spacing={1}>
                                  <Button
                                    variant="contained"
                                    onClick={() => void handleRenameSection()}
                                    disabled={renameSectionSubmitting || !renameSectionValue.trim()}
                                    startIcon={renameSectionSubmitting ? <CircularProgress size={14} color="inherit" /> : <FaCheck size={12} />}
                                    sx={{ textTransform: "none" }}
                                  >
                                    {renameSectionSubmitting ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    color="inherit"
                                    onClick={cancelRenameSection}
                                    disabled={renameSectionSubmitting}
                                    sx={{ textTransform: "none" }}
                                  >
                                    Cancel
                                  </Button>
                                </Stack>
                              </Stack>
                            ) : (
                              <>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                  <Typography variant="h5" component="h2" sx={{ textWrap: "balance" }}>
                                    {activeSection.subtag.name}
                                  </Typography>
                                  <Chip
                                    label="Rename"
                                    size="small"
                                    onClick={startRenameSection}
                                    icon={<FaPenToSquare size={11} />}
                                    sx={{
                                      borderRadius: "6px",
                                      backgroundColor: "rgba(255,255,255,0.04)",
                                      color: "text.secondary",
                                      "&:hover": {
                                        backgroundColor: "rgba(255,255,255,0.06)",
                                        color: "text.primary",
                                      },
                                    }}
                                  />
                                </Stack>
                                <Typography variant="body2" color="text.secondary">
                                  {filteredNotes.length} of {activeSection.notes.length} lectures visible
                                  {activeSectionQuery.trim() ? ` for "${activeSectionQuery}"` : ""}
                                </Typography>
                                {!canReorderNotes && activeSectionQuery.trim() && (
                                  <Typography variant="caption" color="text.secondary">
                                    Clear the section search to reorder lectures.
                                  </Typography>
                                )}
                              </>
                            )}
                          </Stack>

                          <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: 32 }}>
                            <Typography
                              variant="subtitle2"
                              color="text.secondary"
                              sx={{ letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1 }}
                            >
                              Workspace
                            </Typography>
                            <Tooltip title="Delete category">
                              <span>
                                <IconButton
                                  onClick={() => setConfirmCategoryDeleteOpen(true)}
                                  aria-label="Delete category"
                                  disabled={deletingCategory}
                                  size="small"
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    p: 0,
                                    "&:hover": { backgroundColor: "rgba(255,255,255,0.04)" },
                                    "&:focus-visible": {
                                      outline: "2px solid #e0e0e0",
                                      outlineOffset: 2,
                                    },
                                  }}
                                >
                                  {deletingCategory ? <CircularProgress size={15} color="inherit" /> : <FaTrashCan size={14} />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </Stack>

                        <Divider />

                        {filteredNotes.length === 0 ? (
                          <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: 280 }}>
                            <Typography variant="h6">
                              {activeSection.notes.length === 0 && !activeSectionQuery.trim() ? "No Lectures Yet" : "No Lectures Match"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {activeSection.notes.length === 0 && !activeSectionQuery.trim()
                                ? "Add a lecture note to start building this section."
                                : "Adjust the section search in the right utility rail."}
                            </Typography>
                          </Stack>
                        ) : (
                          <Stack spacing={2}>
                            {filteredNotes.map((note) => (
                              <Box
                                key={note.id}
                                id={`module-note-${note.id}`}
                                onClick={() => setActiveNoteId(note.id)}
                                sx={{ scrollMarginTop: 104 }}
                              >
                                <Note
                                  note={note}
                                  onUpdate={updateNote}
                                  onDelete={deleteNote}
                                  onChanged={onNotesChanged}
                                  refresh={refresh}
                                />
                              </Box>
                            ))}
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                  </AnimatePresence>
                ) : (
                  <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: 420 }}>
                    <Typography variant="h6">Select a Section</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pick a section from the explorer to view its lectures.
                    </Typography>
                  </Stack>
                )}
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.07)",
                  backgroundColor: "#141414",
                  position: { xl: "sticky" },
                  top: { xl: 88 },
                }}
              >
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Section Files
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      Search and open files linked to the active section.
                    </Typography>
                  </Box>

                  {visibleSections.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Adjust the section filter to inspect files.
                    </Typography>
                  ) : (
                    activeSection ? (
                      <AnimatePresence mode="wait" initial={false}>
                        <Box
                          key={`section-files-${activeSection.id}`}
                          component={motion.div}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={motionTransitions.base}
                        >
                          <Stack spacing={2}>
                            <TextField
                              fullWidth
                              size="small"
                              placeholder="Search this section…"
                              value={activeSectionQuery}
                              onChange={(event) => setActiveSectionQuery(event.target.value)}
                              inputProps={{ "aria-label": "Search this section" }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <FaMagnifyingGlass size={13} style={{ color: "#6b6b6b" }} />
                                  </InputAdornment>
                                ),
                                endAdornment: activeSectionQuery ? (
                                  <InputAdornment position="end">
                                    <IconButton
                                      size="small"
                                      onClick={() => setActiveSectionQuery("")}
                                      aria-label="Clear section search"
                                      sx={{ padding: "4px" }}
                                    >
                                      <FaXmark size={12} />
                                    </IconButton>
                                  </InputAdornment>
                                ) : null,
                              }}
                            />

                            <Box
                              component="button"
                              onClick={toggleSectionPreview}
                              aria-label="Toggle content preview"
                              aria-pressed={activeSectionSnippets}
                              sx={{
                                alignSelf: "flex-start",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                px: "10px",
                                height: 32,
                                cursor: "pointer",
                                borderRadius: "6px",
                                border: "1px solid",
                                borderColor: activeSectionSnippets ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)",
                                backgroundColor: activeSectionSnippets ? "rgba(255,255,255,0.06)" : "transparent",
                                color: activeSectionSnippets ? "#ededed" : "#6b6b6b",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                                transition: "background-color 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out",
                                "&:hover": {
                                  backgroundColor: "rgba(255,255,255,0.06)",
                                  borderColor: "rgba(255,255,255,0.12)",
                                  color: "#ededed",
                                },
                                "&:focus-visible": {
                                  outline: "2px solid #e0e0e0",
                                  outlineOffset: 2,
                                },
                                touchAction: "manipulation",
                              }}
                            >
                              <FaBars size={11} />
                              Preview {activeSectionSnippets ? "on" : "off"}
                            </Box>

                            <SectionFiles
                              primaryTagName={moduleInfo.primary_tag.name}
                              subtagName={activeSection.subtag.name}
                              fileFilter={activeSectionQuery}
                              showSnippets={activeSectionSnippets}
                              sectionQuery={activeSectionQuery}
                              showEmptyState
                              emptyMessage="No section files match the current search."
                            />
                          </Stack>
                        </Box>
                      </AnimatePresence>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Select a section to browse its linked files.
                      </Typography>
                    )
                  )}
                </Stack>
              </Paper>
            </Box>
          </Stack>
        )}
      </Box>

      <NoteDialog
        open={open}
        onClose={() => setOpen(false)}
        primaryTagId={moduleInfo?.primary_tag.id ?? 0}
        tagColor={moduleInfo?.primary_tag.color}
        onSaved={(note) => {
          addOrReplaceNote(note);
          const nextSection = moduleInfo?.sections.find((section) => section.subtag.id === note.subtags[0]?.id);
          if (nextSection) {
            setActiveSectionId(nextSection.id);
          }
          setActiveNoteId(note.id);
          onNotesChanged?.();
        }}
        refresh={refresh}
      />

      {searchActiveFile && (
        <ObsidianFileDialog
          ref={searchDialogRef}
          open={searchFileOpen}
          onClose={() => setSearchFileOpen(false)}
          file={searchActiveFile}
          onWikiLink={(name) => openSearchFile(name)}
          onRefresh={() => openSearchFile(searchActiveFile.name)}
        />
      )}

      <Dialog
        open={categoryDialogOpen}
        onClose={() => {
          if (categorySubmitting) return;
          setCategoryDialogOpen(false);
          setCategoryError(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Add Category</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {categoryError && (
            <Alert severity="error" onClose={() => setCategoryError(null)}>
              {categoryError}
            </Alert>
          )}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="subtitle2" color="text.primary" sx={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Category name
            </Typography>
            <TextField
              value={newCategoryName}
              onChange={(event) => {
                setNewCategoryName(event.target.value);
                if (categoryError) setCategoryError(null);
              }}
              placeholder="Enter category name"
              fullWidth
              autoFocus
              size="small"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleCreateCategory();
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCategoryDialogOpen(false);
              setCategoryError(null);
            }}
            disabled={categorySubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleCreateCategory()}
            disabled={categorySubmitting || !newCategoryName.trim()}
            startIcon={categorySubmitting ? <CircularProgress size={14} color="inherit" /> : null}
          >
            {categorySubmitting ? "Adding..." : "Add category"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialogue
        open={confirmCategoryDeleteOpen}
        onConfirm={() => {
          setConfirmCategoryDeleteOpen(false);
          void handleDeleteCategory();
        }}
        onDecline={() => setConfirmCategoryDeleteOpen(false)}
        title={`Delete "${activeSection?.subtag.name ?? "category"}"`}
        message="This category will be permanently deleted."
        confirmLabel="Delete"
      />
    </Box>
  );
}

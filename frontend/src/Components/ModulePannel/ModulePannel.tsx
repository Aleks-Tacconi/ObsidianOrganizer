import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Divider,
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
import { alpha } from "@mui/material/styles";
import {
  FaAngleDown,
  FaAngleRight,
  FaBars,
  FaBookOpen,
  FaFolder,
  FaGraduationCap,
  FaMagnifyingGlass,
  FaPlus,
  FaRegFileLines,
  FaXmark,
} from "react-icons/fa6";

import Note from "../Note/Note";
import NoteDialog from "../NoteDialogue/NoteDialogue";
import ProgressBar from "./Components/ProgressBar";
import SectionFiles from "./Components/SectionFiles";
import Grades from "./Components/Grades";
import ObsidianFileDialog, { type ObsidianFileDialogHandle } from "./Components/ObsidianFileDialog";
import api from "../../Utils/api";
import { motionTransitions, staggerContainer, staggerItem } from "../../Utils/motion";

import type { Note as NoteType, PrimaryTag } from "../../Utils/types/api.schemas";
import { useModuleNotes } from "../../Utils/useModuleNotes";

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

export default function ModulePanel({
  moduleId,
  refresh,
  onNotesChanged,
}: {
  moduleId: PrimaryTag;
  refresh: number;
  onNotesChanged?: () => void;
}) {
  const { moduleInfo, updateNote, deleteNote, addOrReplaceNote } = useModuleNotes(
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

  const activeSection = allSections.find((section) => section.id === activeSectionId) ?? null;
  const activeSectionQuery = activeSection ? sectionQueries[activeSection.id] ?? "" : "";
  const activeSectionSnippets = activeSection ? sectionSnippets[activeSection.id] ?? false : false;
  const filteredNotes = useMemo(
    () => activeSection?.notes.filter((note) => matchesNoteQuery(note, activeSectionQuery)) ?? [],
    [activeSection, activeSectionQuery],
  );

  useEffect(() => {
    if (filteredNotes.length === 0) {
      setActiveNoteId(null);
      return;
    }

    if (!filteredNotes.some((note) => note.id === activeNoteId)) {
      setActiveNoteId(filteredNotes[0].id);
    }
  }, [activeNoteId, filteredNotes]);

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
            <Paper
              component={motion.section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={motionTransitions.dialog}
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.07)",
                backgroundColor: "#141414",
              }}
            >
              <Stack spacing={3}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                  spacing={2}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                      <FaGraduationCap size={20} style={{ color: moduleInfo?.primary_tag.color }} />
                      <Typography variant="h4" sx={{ textWrap: "balance" }}>
                        {moduleInfo?.primary_tag.name}
                      </Typography>
                    </Stack>
                    {moduleInfo?.description && (
                      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 920 }}>
                        {moduleInfo.description}
                      </Typography>
                    )}
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center">
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
                  </Stack>
                </Stack>

                <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                  <Box sx={{ minWidth: 180 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.75, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Overview
                    </Typography>
                    <Stack spacing={0.5}>
                      <Typography variant="body2">{moduleInfo.sections.length} sections</Typography>
                      <Typography variant="body2">{allNotes.length} lectures</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {moduleInfo.grades.length} grade items
                      </Typography>
                    </Stack>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <ProgressBar Notes={allNotes} color={moduleInfo?.primary_tag.color} />
                  </Box>
                </Stack>

                <Divider />

                <Box>
                  <Grades moduleInfo={moduleInfo} embedded />
                </Box>
              </Stack>
            </Paper>

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
                              sx={{
                                borderRadius: "6px",
                                alignItems: "center",
                                px: 1.25,
                                py: 1,
                                "&.Mui-selected": {
                                  backgroundColor: alpha(moduleInfo.primary_tag.color, 0.12),
                                  border: `1px solid ${alpha(moduleInfo.primary_tag.color, 0.3)}`,
                                },
                                "&.Mui-selected:hover": {
                                  backgroundColor: alpha(moduleInfo.primary_tag.color, 0.16),
                                },
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 24, color: "text.secondary" }}>
                                {sectionIsActive ? <FaAngleDown size={12} /> : <FaAngleRight size={12} />}
                              </ListItemIcon>
                              <ListItemIcon sx={{ minWidth: 24, color: moduleInfo.primary_tag.color }}>
                                <FaFolder size={13} />
                              </ListItemIcon>
                              <ListItemText
                                primary={section.subtag.name}
                                secondary={`${section.notes.length} lecture${section.notes.length === 1 ? "" : "s"}`}
                                primaryTypographyProps={{ fontWeight: 600, fontSize: "0.95rem", color: "text.primary" }}
                                secondaryTypographyProps={{ fontSize: "0.75rem", color: "text.secondary" }}
                              />
                            </ListItemButton>

                            {sectionIsActive && sectionNotes.length > 0 && (
                              <List disablePadding sx={{ mt: 0.5, ml: 4.5, display: "flex", flexDirection: "column", gap: 0.25 }}>
                                {sectionNotes.map((note) => (
                                  <ListItemButton
                                    key={note.id}
                                    selected={note.id === activeNoteId}
                                    onClick={() => focusNote(note.id)}
                                    sx={{
                                      minHeight: 34,
                                      borderRadius: "6px",
                                      px: 1,
                                      py: 0.625,
                                      color: note.id === activeNoteId ? "text.primary" : "text.secondary",
                                      "&.Mui-selected": {
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
                                  </ListItemButton>
                                ))}
                              </List>
                            )}
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
                  <Stack spacing={3}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "flex-start" }}
                      spacing={1.5}
                    >
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.75 }}>
                          <FaFolder size={14} style={{ color: moduleInfo.primary_tag.color }} />
                          <Typography variant="h5" component="h2" sx={{ textWrap: "balance" }}>
                            {activeSection.subtag.name}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {filteredNotes.length} of {activeSection.notes.length} lectures visible
                          {activeSectionQuery.trim() ? ` for "${activeSectionQuery}"` : ""}
                        </Typography>
                      </Box>

                      <Typography variant="subtitle2" color="text.secondary" sx={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        Workspace
                      </Typography>
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
    </Box>
  );
}

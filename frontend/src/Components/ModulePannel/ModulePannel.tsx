import React, { useCallback, useEffect, useRef, useState } from "react";
import Fuse from "fuse.js";
import {
  Chip,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  Paper,
  TextField,
  Typography,
  Stack,
  Collapse,
  Divider,
  Skeleton,
  Tooltip,
  Box,
} from "@mui/material";
import { FaPlus, FaAngleRight, FaAngleDown, FaGraduationCap, FaFolder, FaFolderOpen, FaNoteSticky, FaMagnifyingGlass, FaXmark, FaRegFileLines, FaBars, FaBookOpen } from "react-icons/fa6";

import Note from "../Note/Note";
import NoteDialog from "../NoteDialogue/NoteDialogue";
import ProgressBar from "./Components/ProgressBar";
import SectionFiles from "./Components/SectionFiles";
import Grades from "./Components/Grades";
import ObsidianFileDialog, { type ObsidianFileDialogHandle } from "./Components/ObsidianFileDialog";
import api from "../../Utils/api";

import type { PrimaryTag, Note as NoteType } from "../../Utils/types/api.schemas";
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
  const [globalQuery, setGlobalQuery] = useState("");
  const [sectionQueries, setSectionQueries] = useState<Record<number, string>>({});
  const [sectionSnippets, setSectionSnippets] = useState<Record<number, boolean>>({});
  const [sectionFiles, setSectionFiles] = useState<Record<number, string[]>>({});
  const [searchFileOpen, setSearchFileOpen] = useState(false);
  const [searchActiveFile, setSearchActiveFile] = useState<{ name: string; content: string } | null>(null);
  const [showSnippets, setShowSnippets] = useState(false);
  const [snippetCache, setSnippetCache] = useState<Record<string, string[]>>({});
  const [lastNote, setLastNote] = useState<string | null>(
    () => localStorage.getItem("obsidian-last-note"),
  );
  const searchDialogRef = useRef<ObsidianFileDialogHandle>(null);

  // Fetch file names for every section so search can match against them
  const fetchSectionFiles = useCallback((primaryTagName: string, sections: { id: number; subtag: { name: string } }[]) => {
    sections.forEach((section) => {
      api
        .post<{ files: string[] }>("match-tags/", {
          tags: [primaryTagName, section.subtag.name],
        })
        .then((res) => {
          if (res?.data) {
            const basenames = res.data.files.map(
              (f) => f.split("/").pop()?.replace(/\.md$/, "") ?? f,
            );
            setSectionFiles((prev) => ({ ...prev, [section.id]: basenames }));
          }
        })
        .catch(() => {/* silently ignore */});
    });
  }, []);

  const fetchSnippets = useCallback((query: string, files: string[]) => {
    if (!query.trim() || files.length === 0) return;
    api
      .post<{ results: { name: string; snippets: string[] }[] }>("search-in-files/", {
        query,
        files,
      })
      .then((res) => {
        if (res?.data) {
          const cache: Record<string, string[]> = {};
          res.data.results.forEach(({ name, snippets }) => {
            cache[name] = snippets;
          });
          setSnippetCache(cache);
        }
      })
      .catch(() => {/* silently ignore */});
  }, []);

  // Expand first section by default when data first loads
  useEffect(() => {
    if (moduleInfo?.sections.length && expandedSections.length === 0) {
      setExpandedSections([moduleInfo.sections[0].id]);
    }
    // expandedSections intentionally excluded — only run when moduleInfo changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleInfo]);

  // Pre-fetch file names for all sections so global search can match against them
  useEffect(() => {
    if (!moduleInfo) return;
    fetchSectionFiles(
      moduleInfo.primary_tag.name,
      moduleInfo.sections.map((s) => ({ id: s.id, subtag: { name: s.subtag.name } })),
    );
  }, [moduleInfo, fetchSectionFiles]);

  // When showSnippets is on and a global query is active, fetch content snippets
  useEffect(() => {
    if (!showSnippets || !globalQuery.trim() || !moduleInfo) {
      setSnippetCache({});
      return;
    }
    const allFiles: string[] = [];
    moduleInfo.sections.forEach((section) => {
      const files = sectionFiles[section.id] ?? [];
      const fuse = new Fuse(files, { threshold: 0.4, distance: 200 });
      fuse.search(globalQuery).forEach((r) => allFiles.push(r.item));
    });
    if (allFiles.length > 0) {
      fetchSnippets(globalQuery, allFiles);
    } else {
      setSnippetCache({});
    }
  }, [showSnippets, globalQuery, sectionFiles, moduleInfo, fetchSnippets]);

  const allNotes = (moduleInfo?.sections.flatMap((s) => s.notes) ?? []) as unknown as NoteType[];

  const toggleSection = (id: number) => {
    setExpandedSections((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const openSearchFile = (name: string) => {
    api
      .post<{ name: string; content: string }>("obsidian-file-by-name/", { name })
      .then((res) => {
        if (res?.data) {
          setSearchActiveFile(res.data);
          setSearchFileOpen(true);
          searchDialogRef.current?.navigate(res.data);
          setLastNote(name);
        }
      })
      .catch(() => {/* silently ignore */});
  };

  // Highlight all occurrences of query inside a snippet block — returns React nodes
  const highlightSnippet = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    const lower = text.toLowerCase();
    const qLower = query.toLowerCase();
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    let idx = lower.indexOf(qLower, cursor);
    while (idx !== -1) {
      if (idx > cursor) parts.push(text.slice(cursor, idx));
      parts.push(
        <strong key={idx} style={{ color: "#ededed", fontWeight: 600 }}>
          {text.slice(idx, idx + query.length)}
        </strong>
      );
      cursor = idx + query.length;
      idx = lower.indexOf(qLower, cursor);
    }
    if (cursor < text.length) parts.push(text.slice(cursor));
    return <>{parts}</>;
  };

  const loading = moduleInfo === null;

  return (
    <div style={{ width: "100%" }}>
      <Box sx={{ position: "fixed", top: 16, right: 16, zIndex: 2000, display: "flex", alignItems: "center", gap: 0.5 }}>
        <Tooltip title={lastNote ? `Open: ${lastNote}` : "No recently opened note"}>
          <span>
            <IconButton
              onClick={() => { if (lastNote) openSearchFile(lastNote); }}
              disabled={!lastNote || loading}
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
              disabled={loading}
              aria-label="Add note"
            >
              <FaPlus size={16} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

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

            {/* Global search */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search all sections…"
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FaMagnifyingGlass size={13} style={{ color: "#6b6b6b" }} />
                    </InputAdornment>
                  ),
                  endAdornment: globalQuery ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setGlobalQuery("")}
                        aria-label="Clear search"
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
                onClick={() => setShowSnippets((p) => !p)}
                aria-label="Toggle content preview"
                aria-pressed={showSnippets}
                sx={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  px: "10px",
                  height: 32,
                  cursor: "pointer",
                  borderRadius: "6px",
                  border: "1px solid",
                  borderColor: showSnippets ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)",
                  backgroundColor: showSnippets ? "rgba(255,255,255,0.06)" : "transparent",
                  color: showSnippets ? "#ededed" : "#6b6b6b",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  transition: "background-color 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)", color: "#ededed" },
                  outline: "none",
                }}
              >
                <FaBars size={11} />
                Preview {showSnippets ? "on" : "off"}
              </Box>
            </Stack>

            {/* Sections */}
            {moduleInfo?.sections.length === 0 ? (
              <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
                <FaFolderOpen size={32} style={{ color: "#6b6b6b" }} />
                <Typography variant="body1" color="text.secondary">
                  No sections yet. Add a note to get started.
                </Typography>
              </Stack>
            ) : globalQuery.trim() ? (
              /* Flat file search results */
              (() => {
                const allMatches: { file: string; sectionName: string }[] = [];
                moduleInfo.sections.forEach((section) => {
                  const files = sectionFiles[section.id] ?? [];
                  const fuse = new Fuse(files, { threshold: 0.4, distance: 200 });
                  const results = fuse.search(globalQuery).map((r) => r.item);
                  results.forEach((f) => allMatches.push({ file: f, sectionName: section.subtag.name }));
                });
                if (allMatches.length === 0) {
                  return (
                    <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
                      <FaMagnifyingGlass size={24} style={{ color: "#6b6b6b" }} />
                      <Typography variant="body1" color="text.secondary">
                        No files match your search.
                      </Typography>
                    </Stack>
                  );
                }
                 return (
                   <List dense disablePadding>
                     {allMatches.map(({ file, sectionName }) => {
                       const snippets = showSnippets ? (snippetCache[file] ?? []) : [];
                       return (
                         <ListItemButton
                           key={`${sectionName}-${file}`}
                           onClick={() => openSearchFile(file)}
                           sx={{ py: 1, borderRadius: "6px", alignItems: "flex-start" }}
                         >
                           <ListItemIcon sx={{ minWidth: 28, mt: "2px" }}>
                             <FaRegFileLines size={16} />
                           </ListItemIcon>
                           <Box sx={{ flex: 1, minWidth: 0 }}>
                             <Stack direction="row" alignItems="center" spacing={1}>
                               <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, flex: 1, minWidth: 0 }} noWrap>
                                 {file}
                               </Typography>
                               <Chip
                                 label={sectionName}
                                 size="small"
                                 sx={{
                                   flexShrink: 0,
                                   height: 18,
                                   fontSize: "0.65rem",
                                   backgroundColor: "rgba(255,255,255,0.06)",
                                   color: "text.secondary",
                                   border: "1px solid rgba(255,255,255,0.08)",
                                   "& .MuiChip-label": { px: 0.75 },
                                 }}
                               />
                             </Stack>
                             {showSnippets && snippets.length > 0 && (
                               <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: "12px" }}>
                                 {snippets.map((snippet, i) => (
                                   <Box
                                     key={i}
                                     sx={{
                                       pl: 1.5,
                                       borderLeft: "2px solid rgba(255,255,255,0.12)",
                                       py: "2px",
                                     }}
                                   >
                                     <Typography
                                       component="pre"
                                       sx={{
                                         m: 0,
                                         fontFamily: "monospace",
                                         fontSize: "0.72rem",
                                         color: "#6b6b6b",
                                         lineHeight: 1.6,
                                         whiteSpace: "pre-wrap",
                                         wordBreak: "break-word",
                                       }}
                                     >
                                       {highlightSnippet(snippet, globalQuery)}
                                     </Typography>
                                   </Box>
                                 ))}
                               </Box>
                             )}
                           </Box>
                         </ListItemButton>
                       );
                     })}
                   </List>
                 );
              })()
            ) : (
              /* Normal section cards view */
              <Stack spacing={2}>
                {moduleInfo.sections.map((section) => {
                  const sectionNotes = section.notes as unknown as NoteType[];
                  const sectionQuery = sectionQueries[section.id] ?? "";
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
                        <FaFolder size={14} style={{ color: moduleInfo.primary_tag.color }} />
                        <Typography variant="h6" sx={{ flex: 1 }}>
                          {section.subtag.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sectionNotes.length}{" "}
                          {sectionNotes.length === 1 ? "lecture" : "lectures"}
                        </Typography>
                      </Stack>

                      <Collapse in={isExpanded}>
                        <Divider />
                        <Box sx={{ px: 3, pt: 3, pb: 3 }}>
                          {/* Per-section search */}
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <TextField
                              fullWidth
                              size="small"
                              placeholder="Search this section…"
                              value={sectionQuery}
                              onChange={(e) =>
                                setSectionQueries((prev) => ({
                                  ...prev,
                                  [section.id]: e.target.value,
                                }))
                              }
                              onClick={(e) => e.stopPropagation()}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <FaMagnifyingGlass size={13} style={{ color: "#6b6b6b" }} />
                                  </InputAdornment>
                                ),
                                endAdornment: sectionQuery ? (
                                  <InputAdornment position="end">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSectionQueries((prev) => ({
                                          ...prev,
                                          [section.id]: "",
                                        }));
                                      }}
                                      aria-label="Clear section search"
                                      sx={{ padding: "4px" }}
                                    >
                                      <FaXmark size={12} />
                                    </IconButton>
                                  </InputAdornment>
                                ) : null,
                              }}
                            />
                            {sectionQuery.trim() && (() => {
                              const on = sectionSnippets[section.id] ?? false;
                              return (
                                <Box
                                  component="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSectionSnippets((prev) => ({ ...prev, [section.id]: !on }));
                                  }}
                                  aria-label="Toggle content preview"
                                  aria-pressed={on}
                                  sx={{
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    px: "10px",
                                    height: 32,
                                    cursor: "pointer",
                                    borderRadius: "6px",
                                    border: "1px solid",
                                    borderColor: on ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)",
                                    backgroundColor: on ? "rgba(255,255,255,0.06)" : "transparent",
                                    color: on ? "#ededed" : "#6b6b6b",
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    whiteSpace: "nowrap",
                                    transition: "background-color 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out",
                                    "&:hover": { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)", color: "#ededed" },
                                    outline: "none",
                                  }}
                                >
                                  <FaBars size={11} />
                                  Preview {on ? "on" : "off"}
                                </Box>
                              );
                            })()}
                          </Stack>

                          {sectionQuery.trim() ? (
                             /* Search active — show only the files column at full width */
                             <Box>
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
                                 fileFilter={sectionQuery}
                                 showSnippets={sectionSnippets[section.id] ?? false}
                                 sectionQuery={sectionQuery}
                               />
                             </Box>
                           ) : (
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
                               {sectionNotes.length === 0 ? (
                                 <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 3 }}>
                                   <FaNoteSticky size={16} style={{ color: "#6b6b6b", flexShrink: 0 }} />
                                   <Typography variant="body2" color="text.secondary">
                                     No lectures in this section.
                                   </Typography>
                                 </Stack>
                               ) : (
                                 sectionNotes.map((note) => (
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
                                 showSnippets={false}
                                 sectionQuery=""
                               />
                             </Box>
                           </Stack>
                           )}
                        </Box>
                      </Collapse>
                    </Paper>
                  );
                })}
              </Stack>
            )}
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
    </div>
  );
}

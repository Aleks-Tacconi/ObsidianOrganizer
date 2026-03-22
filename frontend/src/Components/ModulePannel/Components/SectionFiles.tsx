import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Skeleton, Stack, Typography } from "@mui/material";
import api from "../../../Utils/api";
import ObsidianFileDialog, { type ObsidianFileDialogHandle } from "./ObsidianFileDialog";
import { FaRegFileLines } from "react-icons/fa6";

function highlightSnippet(text: string, query: string): React.ReactNode {
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
}

export default function SectionFiles({
  primaryTagName,
  subtagName,
  fileFilter,
  showSnippets,
  sectionQuery,
  compact = false,
  showEmptyState = false,
  emptyMessage = "No files found.",
}: {
  primaryTagName: string;
  subtagName: string;
  fileFilter?: string;
  showSnippets?: boolean;
  sectionQuery?: string;
  compact?: boolean;
  showEmptyState?: boolean;
  emptyMessage?: string;
}) {
  const [files, setFiles] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeFile, setActiveFile] = useState<{ name: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileError, setFileError] = useState<string | null>(null);
  const [snippetCache, setSnippetCache] = useState<Record<string, string[]>>({});
  const dialogRef = useRef<ObsidianFileDialogHandle>(null);

  const openFile = (path: string) => {
    setFileError(null);
    api
      .post<{ name: string; content: string }>("obsidian-file/", { path })
      .then((res) => {
        if (res?.data) {
          setActiveFile(res.data);
          setOpen(true);
          dialogRef.current?.navigate(res.data);
        }
      })
      .catch(() => setFileError("Could not open file."));
  };

  const openWikiLink = (name: string) => {
    setFileError(null);
    api
      .post<{ name: string; content: string }>("obsidian-file-by-name/", { name })
      .then((res) => {
        if (res?.data) {
          setActiveFile(res.data);
          setOpen(true);
          dialogRef.current?.navigate(res.data);
        }
      })
      .catch(() => setFileError("Could not open linked file."));
  };

  const refreshFile = () => {
    if (!activeFile) return;
    api
      .post<{ name: string; content: string }>("obsidian-file-by-name/", { name: activeFile.name })
      .then((res) => {
        if (res?.data) {
          setActiveFile(res.data);
          dialogRef.current?.refreshCurrent(res.data);
        }
      })
      .catch(() => setFileError("Could not refresh file."));
  };

  useEffect(() => {
    setLoading(true);
    api
      .post<{ files: string[] }>("match-tags/", { tags: [primaryTagName, subtagName] })
      .then((res) => {
        if (res?.data) setFiles(res.data.files);
      })
      .catch(() => {
        // silently ignore — no notes column is fine
      })
      .finally(() => setLoading(false));
  }, [primaryTagName, subtagName]);

  const fetchSnippets = useCallback((query: string, fileNames: string[]) => {
    if (!query.trim() || fileNames.length === 0) return;
    api
      .post<{ results: { name: string; snippets: string[] }[] }>("search-in-files/", {
        query,
        files: fileNames,
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

  const filenameMatches = fileFilter?.trim()
    ? files.filter((f) => {
        const name = f.split("/").pop()?.replace(/\.md$/, "") ?? f;
        return name.toLowerCase().includes(fileFilter.toLowerCase());
      })
    : files;

  // When preview is on, search ALL files by content so content-only hits are found
  useEffect(() => {
    if (!showSnippets || !sectionQuery?.trim() || files.length === 0) {
      setSnippetCache({});
      return;
    }
    const allNames = files.map((f) => f.split("/").pop()?.replace(/\.md$/, "") ?? f);
    fetchSnippets(sectionQuery, allNames);
  }, [showSnippets, sectionQuery, files, fetchSnippets]);

  // Merge filename matches with content-only hits when preview is on,
  // then sort: filename matches first (by match position), content-only after.
  const displayFiles = (() => {
    if (!fileFilter?.trim()) return filenameMatches;

    const filterLower = fileFilter.toLowerCase();
    const filenameSet = new Set(filenameMatches.map((f) => f));

    // Start with filename matches, sorted by how early the query appears
    const sorted = [...filenameMatches].sort((a, b) => {
      const nameA = (a.split("/").pop()?.replace(/\.md$/, "") ?? a).toLowerCase();
      const nameB = (b.split("/").pop()?.replace(/\.md$/, "") ?? b).toLowerCase();
      return nameA.indexOf(filterLower) - nameB.indexOf(filterLower);
    });

    // Append content-only hits when preview is on
    if (showSnippets) {
      const contentHits = new Set(Object.keys(snippetCache));
      files.forEach((f) => {
        const basename = f.split("/").pop()?.replace(/\.md$/, "") ?? f;
        if (contentHits.has(basename) && !filenameSet.has(f)) {
          sorted.push(f);
        }
      });
    }

    return sorted;
  })();

  if (loading) {
    return (
      <Stack spacing={1}>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
      </Stack>
    );
  }

  if (files.length === 0) {
    return showEmptyState ? (
      <Typography variant="body2" color="text.secondary">
        {emptyMessage}
      </Typography>
    ) : null;
  }

  if (displayFiles.length === 0) {
    return showEmptyState ? (
      <Typography variant="body2" color="text.secondary">
        {emptyMessage}
      </Typography>
    ) : null;
  }

  return (
    <>
      {fileError && (
        <Typography variant="caption" color="error" sx={{ mb: 1, display: "block" }}>
          {fileError}
        </Typography>
      )}
      <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: compact ? 0.25 : 0.5 }}>
        {displayFiles.map((file) => {
          const fileName = file.split("/").pop()?.replace(/\.md$/, "") ?? file;
          const snippets = showSnippets ? (snippetCache[fileName] ?? []) : [];
          return (
            <ListItemButton
              key={file}
              onClick={() => openFile(file)}
              sx={{
                px: compact ? 1 : 1.25,
                py: compact ? 0.75 : 1,
                borderRadius: "6px",
                alignItems: snippets.length > 0 ? "flex-start" : "center",
                color: compact ? "text.secondary" : "text.primary",
                transition: "background-color 150ms ease-out, color 150ms ease-out",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.03)",
                  color: "text.primary",
                },
                "&.Mui-focusVisible": {
                  outline: "2px solid #e0e0e0",
                  outlineOffset: 2,
                  backgroundColor: "rgba(255,255,255,0.04)",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: compact ? 24 : 28, mt: snippets.length > 0 ? "2px" : 0, color: "inherit" }}>
                <FaRegFileLines size={compact ? 14 : 16} />
              </ListItemIcon>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <ListItemText
                  primary={fileName}
                  primaryTypographyProps={{
                    fontSize: "0.875rem",
                    fontWeight: compact ? 400 : 500,
                    lineHeight: 1.4,
                    color: "inherit",
                    sx: { overflowWrap: "anywhere" },
                  }}
                />
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
                          {highlightSnippet(snippet, sectionQuery ?? "")}
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

      {activeFile && (
        <ObsidianFileDialog
          ref={dialogRef}
          open={open}
          onClose={() => setOpen(false)}
          file={activeFile}
          onWikiLink={openWikiLink}
          onRefresh={refreshFile}
        />
      )}
    </>
  );
}

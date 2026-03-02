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
}: {
  primaryTagName: string;
  subtagName: string;
  fileFilter?: string;
  showSnippets?: boolean;
  sectionQuery?: string;
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

  const displayFiles = fileFilter?.trim()
    ? files.filter((f) => {
        const name = f.split("/").pop()?.replace(/\.md$/, "") ?? f;
        return name.toLowerCase().includes(fileFilter.toLowerCase());
      })
    : files;

  // Fetch snippets when preview is on and a query + files are available
  useEffect(() => {
    if (!showSnippets || !sectionQuery?.trim() || displayFiles.length === 0) {
      setSnippetCache({});
      return;
    }
    const names = displayFiles.map((f) => f.split("/").pop()?.replace(/\.md$/, "") ?? f);
    fetchSnippets(sectionQuery, names);
  // displayFiles changes on every render if not memoised — depend on the stable inputs instead
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSnippets, sectionQuery, files, fileFilter, fetchSnippets]);

  if (loading) {
    return (
      <Stack spacing={1}>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
      </Stack>
    );
  }

  if (files.length === 0) {
    return null;
  }

  if (displayFiles.length === 0) {
    return null;
  }

  return (
    <>
      {fileError && (
        <Typography variant="caption" color="error" sx={{ mb: 1, display: "block" }}>
          {fileError}
        </Typography>
      )}
      <List dense disablePadding>
        {displayFiles.map((file) => {
          const fileName = file.split("/").pop()?.replace(/\.md$/, "") ?? file;
          const snippets = showSnippets ? (snippetCache[fileName] ?? []) : [];
          return (
            <ListItemButton
              key={file}
              onClick={() => openFile(file)}
              sx={{ py: 1, borderRadius: "6px", alignItems: snippets.length > 0 ? "flex-start" : "center" }}
            >
              <ListItemIcon sx={{ minWidth: 28, mt: snippets.length > 0 ? "2px" : 0 }}>
                <FaRegFileLines size={16} />
              </ListItemIcon>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <ListItemText
                  primary={fileName}
                  primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 500 }}
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

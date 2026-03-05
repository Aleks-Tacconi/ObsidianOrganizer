import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  IconButton,
  Tooltip,
  List,
  ListItemButton,
  Divider,
} from "@mui/material";
import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { FaAngleLeft, FaAngleRight, FaRegImage, FaRotate, FaThumbtack, FaUpRightFromSquare, FaXmark } from "react-icons/fa6";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const STORAGE_KEY = "obsidian-pinned-notes";
const LAST_NOTE_KEY = "obsidian-last-note";

function loadPins(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function savePins(pins: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
}

function saveLastNote(name: string): void {
  localStorage.setItem(LAST_NOTE_KEY, name);
}

function normalizeName(name: string): string {
  return name.replace(/\.md$/, "");
}

export interface ObsidianFileDialogHandle {
  navigate: (file: { name: string; content: string }) => void;
  refreshCurrent: (file: { name: string; content: string }) => void;
}

export default forwardRef(function ObsidianFileDialog(
  {
    open,
    onClose,
    file,
    onWikiLink,
    onRefresh,
  }: {
    open: boolean;
    onClose: () => void;
    file: { name: string; content: string } | null;
    onWikiLink: (name: string) => void;
    onRefresh: () => void;
  },
  ref: React.Ref<ObsidianFileDialogHandle>,
) {
  const [history, setHistory] = useState<{ name: string; content: string }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [pinnedNotes, setPinnedNotes] = useState<string[]>(() => loadPins());

  // Seed history with the initial file when the dialog opens for the first time
  useEffect(() => {
    if (open && file && history.length === 0) {
      setHistory([file]);
      setHistoryIndex(0);
      saveLastNote(normalizeName(file.name));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file]);

  // Reset history when dialog closes
  useEffect(() => {
    if (!open) {
      setHistory([]);
      setHistoryIndex(null);
    }
  }, [open]);

  const navigate = (newFile: { name: string; content: string }) => {
    const newHistory = history.slice(0, historyIndex === null ? undefined : historyIndex + 1);
    setHistory([...newHistory, newFile]);
    setHistoryIndex(newHistory.length);
    saveLastNote(normalizeName(newFile.name));
  };

  const refreshCurrent = (newFile: { name: string; content: string }) => {
    if (historyIndex === null) {
      navigate(newFile);
    } else {
      const newHistory = [...history];
      newHistory[historyIndex] = newFile;
      setHistory(newHistory);
    }
  };

  useImperativeHandle(ref, () => ({ navigate, refreshCurrent }));

  const goBack = () => {
    if (historyIndex && historyIndex > 0) setHistoryIndex(historyIndex - 1);
  };

  const goForward = () => {
    if (historyIndex !== null && historyIndex < history.length - 1)
      setHistoryIndex(historyIndex + 1);
  };

  const currentFile = historyIndex !== null ? history[historyIndex] : file;
  if (!currentFile) return null;

  const currentName = normalizeName(currentFile.name);
  const isPinned = pinnedNotes.includes(currentName);

  const togglePin = () => {
    const next = isPinned
      ? pinnedNotes.filter((n) => n !== currentName)
      : [...pinnedNotes, currentName];
    setPinnedNotes(next);
    savePins(next);
  };

  const unpinNote = (name: string) => {
    const next = pinnedNotes.filter((n) => n !== name);
    setPinnedNotes(next);
    savePins(next);
  };

  const hasBack = historyIndex !== null && historyIndex > 0;
  const hasForward = historyIndex !== null && historyIndex < history.length - 1;

  const fileHeading = `## ${currentName}\n\n`;
  const contentWithWikiLinks =
    fileHeading +
    currentFile.content.replace(
      /!?(\[\[([^\]|]+)(\|([^\]]+))?\]\])/g,
      (_, ___, name, __, alias) => `<wikilink name="${name}">${alias || name}</wikilink>`,
    );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          height: "85vh",
          width: "80vw",
          overflow: "hidden",
          backgroundColor: "#1c1c1c",
          display: "flex",
          flexDirection: "column",
        },
      }}
      fullWidth
    >
      {/* Header */}
      <DialogTitle sx={{ pb: 1, flexShrink: 0 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Back">
              <span>
                <IconButton size="small" onClick={goBack} disabled={!hasBack} aria-label="Back">
                  <FaAngleLeft />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Forward">
              <span>
                <IconButton size="small" onClick={goForward} disabled={!hasForward} aria-label="Forward">
                  <FaAngleRight />
                </IconButton>
              </span>
            </Tooltip>
            <Typography variant="body2" color="text.secondary">
              {currentName}
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={0.5}>
            <Tooltip title="Open in Obsidian">
              <IconButton
                size="small"
                component="a"
                href={`obsidian://open?vault=${encodeURIComponent("SecondBrain")}&file=${encodeURIComponent(currentName)}`}
                aria-label="Open in Obsidian"
                sx={{ color: "#6b6b6b", "&:hover": { color: "#ededed" } }}
              >
                <FaUpRightFromSquare size={13} />
              </IconButton>
            </Tooltip>
            <Tooltip title={isPinned ? "Unpin note" : "Pin note"}>
              <IconButton
                size="small"
                onClick={togglePin}
                aria-label={isPinned ? "Unpin note" : "Pin note"}
                sx={{ color: isPinned ? "#ededed" : "#6b6b6b" }}
              >
                <FaThumbtack size={14} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={onRefresh} aria-label="Refresh file">
                <FaRotate size={14} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton size="small" onClick={onClose} aria-label="Close">
                <FaXmark size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogTitle>

      {/* Body: sidebar + content */}
      <Box sx={{ display: "flex", flex: 1, minHeight: 0, borderTop: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Left sidebar — pinned notes */}
        <Box
          sx={{
            width: 220,
            flexShrink: 0,
            borderRight: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              px: 2,
              pt: 2,
              pb: 1,
              color: "#6b6b6b",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              flexShrink: 0,
              display: "block",
            }}
          >
            Pinned
          </Typography>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.07)", flexShrink: 0 }} />

          {pinnedNotes.length === 0 ? (
            <Typography
              variant="caption"
              sx={{ px: 2, pt: 2, color: "#6b6b6b", lineHeight: 1.5, display: "block" }}
            >
              No pinned notes yet.
            </Typography>
          ) : (
            <List dense disablePadding sx={{ flex: 1, overflowY: "auto", py: 1 }}>
              {pinnedNotes.map((name) => {
                const isActive = name === currentName;
                return (
                  <Box
                    key={name}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      px: 1,
                      "&:hover .unpin-btn": { opacity: 1 },
                    }}
                  >
                    <ListItemButton
                      onClick={() => onWikiLink(name)}
                      sx={{
                        flex: 1,
                        borderRadius: "6px",
                        py: "5px",
                        px: 1,
                        backgroundColor: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                        "&:hover": { backgroundColor: "rgba(255,255,255,0.05)" },
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.8rem",
                          fontWeight: isActive ? 500 : 400,
                          color: isActive ? "#ededed" : "#9a9a9a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {name}
                      </Typography>
                    </ListItemButton>
                    <Tooltip title="Unpin">
                      <IconButton
                        className="unpin-btn"
                        size="small"
                        onClick={() => unpinNote(name)}
                        aria-label={`Unpin ${name}`}
                        sx={{
                          flexShrink: 0,
                          ml: 0.5,
                          p: "4px",
                          color: "#6b6b6b",
                          opacity: 0,
                          transition: "opacity 120ms ease-out",
                          "&:hover": { color: "#ededed" },
                        }}
                      >
                        <FaXmark size={11} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                );
              })}
            </List>
          )}
        </Box>

        {/* Main content */}
        <DialogContent
          sx={{ flex: 1, overflowY: "auto", fontSize: "1rem", padding: "2vh 5vw" }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkBreaks, remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, rehypeKatex]}
            components={{
              wikilink: ({ node, children }) => {
                const name = node.properties.name;
                const imageExtensions = [".png", ".jpg", ".jpeg", ".svg", ".gif"];
                const isImage =
                  imageExtensions.some((ext) => name.toLowerCase().endsWith(ext)) ||
                  /\d+$/.test(name);

                if (isImage) {
                  return (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 1,
                        padding: "16px",
                        color: "#6b6b6b",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: "6px",
                        my: 1,
                      }}
                      title={name}
                    >
                      <FaRegImage />
                      <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
                        Image preview not available
                      </Typography>
                    </Box>
                  );
                }

                return (
                  <Typography
                    component="span"
                    sx={{
                      color: "#e0e0e0",
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontSize: "inherit",
                    }}
                    title={name}
                    onClick={() => onWikiLink(name)}
                  >
                    {children}
                  </Typography>
                );
              },

              table: ({ children }) => (
                <table style={{ borderCollapse: "collapse", width: "100%" }}>{children}</table>
              ),
              th: ({ children }) => (
                <th style={{ border: "1px solid rgba(255,255,255,0.07)", padding: "8px" }}>{children}</th>
              ),
              td: ({ children }) => (
                <td style={{ border: "1px solid rgba(255,255,255,0.07)", padding: "8px" }}>{children}</td>
              ),
            }}
          >
            {contentWithWikiLinks}
          </ReactMarkdown>
        </DialogContent>
      </Box>
    </Dialog>
  );
});

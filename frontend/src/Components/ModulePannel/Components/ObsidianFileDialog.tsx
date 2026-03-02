import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { FaAngleLeft, FaAngleRight, FaRegImage, FaRotate, FaXmark } from "react-icons/fa6";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

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

  const hasBack = historyIndex !== null && historyIndex > 0;
  const hasForward = historyIndex !== null && historyIndex < history.length - 1;
  const hasHistory = history.length > 1;

  const fileHeading = `## ${currentFile.name.replace(/\.md$/, "")}\n\n`;
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
        },
      }}
      fullWidth
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            {hasHistory && (
              <>
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
              </>
            )}
            <Typography variant="body2" color="text.secondary">
              {currentFile.name.replace(/\.md$/, "")}
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={0.5}>
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

      <DialogContent
        dividers
        sx={{ height: "80vh", overflowY: "auto", fontSize: "1rem", padding: "2vh 5vw" }}
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
    </Dialog>
  );
});

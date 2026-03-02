import { Dialog, DialogTitle, DialogContent, Typography, Box, IconButton } from "@mui/material";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { FaAngleLeft, FaAngleRight, FaRegImage, FaRotate } from "react-icons/fa6";
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
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton
              size="small"
              onClick={goBack}
              disabled={historyIndex === 0 || historyIndex === null}
            >
              <FaAngleLeft />
            </IconButton>
            <IconButton
              size="small"
              onClick={goForward}
              disabled={historyIndex === null || historyIndex >= history.length - 1}
            >
              <FaAngleRight />
            </IconButton>
            {currentFile.name}
          </Box>

          <IconButton size="small" onClick={onRefresh}>
            <FaRotate />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{ height: "80vh", overflowY: "auto", fontSize: "20px", padding: "2vh 5vw" }}
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
                    display="flex"
                    alignItems="center"
                    gap={0.5}
                    sx={{
                      cursor: "pointer",
                      textAlign: "center",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: "16px",
                      color: "#6b6b6b",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "6px",
                    }}
                    onClick={() => onWikiLink(name)}
                    title={name}
                  >
                    <FaRegImage />
                    <Typography variant="body2" sx={{ fontSize: "16px", padding: "8px" }}>
                      Open this in Obsidian to view
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
                    fontSize: "20px",
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

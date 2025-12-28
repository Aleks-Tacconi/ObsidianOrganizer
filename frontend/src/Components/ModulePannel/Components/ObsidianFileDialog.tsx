import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Button,
  IconButton,
} from "@mui/material";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { FaAngleLeft, FaAngleRight, FaRegImage } from "react-icons/fa6";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import "./ObsidianFileDialog.css";

export interface ObsidianFileDialogHandle {
  navigate: (file: { name: string; content: string }) => void;
}

export default forwardRef(function ObsidianFileDialog(
  {
    open,
    onClose,
    file,
    onWikiLink,
  }: {
    open: boolean;
    onClose: () => void;
    file: { name: string; content: string } | null;
    onWikiLink: (name: string) => void;
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
  useImperativeHandle(ref, () => ({ navigate }));

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
  const contentWithWikiLinks = fileHeading + currentFile.content.replace(
    /!?(\[\[([^\]|]+)(\|([^\]]+))?\]\])/g,
    (_, fullMatch, name, __, alias) => `<wikilink name="${name}">${alias || name}</wikilink>`,
  );
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
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
            sx={{ marginRight: "5px" }}
          >
            <FaAngleRight />
          </IconButton>
          {currentFile.name}
        </Box>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          height: "70vh",
          overflowY: "auto",
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkBreaks, remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeKatex]}
          components={{
            wikilink: ({ node, children }) => {
              const name = (node.properties as any).name;

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
                    sx={{ cursor: "pointer" }}
                    onClick={() => onWikiLink(name)}
                    title={name}
                  >
                    <FaRegImage />
                    <Typography variant="body2">Open this in Obsidian to view</Typography>
                  </Box>
                );
              }

              return (
                <Typography
                  component="span"
                  sx={{ color: "#7b5cff", cursor: "pointer", textDecoration: "underline" }}
                  title={name}
                  onClick={() => onWikiLink(name)}
                >
                  {children}
                </Typography>
              );
            },

            table: ({ node, children }) => (
              <table style={{ borderCollapse: "collapse", width: "100%" }}>{children}</table>
            ),
            th: ({ node, children }) => (
              <th style={{ border: "1px solid gray", padding: "4px" }}>{children}</th>
            ),
            td: ({ node, children }) => (
              <td style={{ border: "1px solid gray", padding: "4px" }}>{children}</td>
            ),
          }}
        >
          {contentWithWikiLinks}
        </ReactMarkdown>
      </DialogContent>
    </Dialog>
  );
});

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

import api, { type RAGCitation } from "../../Utils/api";

type ObsidianFileResponse = {
  path: string;
  name: string;
  content: string;
};

type CitationNoteDialogProps = {
  open: boolean;
  citation: RAGCitation | null;
  highlightRange?: boolean;
  onClose: () => void;
};

export default function CitationNoteDialog({
  open,
  citation,
  highlightRange = false,
  onClose,
}: CitationNoteDialogProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const highlightedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !citation) {
      setContent("");
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setContent("");

    api
      .post<ObsidianFileResponse>("obsidian-file/", { path: citation.file_path })
      .then((res) => {
        if (res?.data?.content != null) {
          setContent(res.data.content);
          return;
        }
        setError("File could not be loaded.");
      })
      .catch(() => {
        setError("File could not be loaded.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, citation]);

  // Scroll highlighted region into view once content is available
  useEffect(() => {
    if (!open || loading || !highlightRange || !highlightedRef.current) return;
    highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [open, loading, content, highlightRange]);

  const lines = useMemo(() => content.split("\n"), [content]);

  const scoreLabel =
    citation != null && citation.relevance_score > 0
      ? `score ${(citation.relevance_score * 100).toFixed(0)}%`
      : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        elevation: 0,
        sx: {
          backgroundColor: "#1c1c1c",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: "6px",
        },
      }}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontFamily: "monospace" }}>
          {citation?.file_name ?? "Citation"}
        </Typography>
        {citation?.relative_path && (
          <Typography variant="caption" sx={{ color: "#6b6b6b", display: "block", mt: 0.25 }}>
            {citation.relative_path}
            {citation.heading ? ` › ${citation.heading}` : ""}
            {scoreLabel ? ` · ${scoreLabel}` : ""}
          </Typography>
        )}
        {citation?.snippet && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 1,
              px: 1.5,
              py: 0.75,
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "6px",
              fontStyle: "italic",
              color: "#aaa",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {citation.snippet.length > 240
              ? `${citation.snippet.slice(0, 240)}…`
              : citation.snippet}
          </Typography>
        )}
      </DialogTitle>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.07)", mt: 1.5 }} />

      <DialogContent sx={{ pt: 1.5 }}>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: "180px" }}>
            <CircularProgress size={24} sx={{ color: "#6b6b6b" }} />
          </Stack>
        ) : error ? (
          <Stack spacing={1} sx={{ py: 2 }}>
            <Typography variant="body2" sx={{ color: "#aaa" }}>
              {error}
            </Typography>
            <Typography variant="caption" sx={{ color: "#6b6b6b", fontFamily: "monospace" }}>
              {citation?.file_path}
            </Typography>
            <Button size="small" variant="outlined" color="inherit" onClick={onClose} sx={{ alignSelf: "flex-start" }}>
              Close
            </Button>
          </Stack>
        ) : (
          <Box
            sx={{
              maxHeight: "62vh",
              overflow: "auto",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "6px",
              backgroundColor: "#141414",
              p: 1.5,
              fontFamily: "monospace",
            }}
          >
            {lines.map((line, index) => {
              const lineNumber = index + 1;
              const isHighlighted =
                highlightRange &&
                citation != null &&
                lineNumber >= citation.line_start &&
                lineNumber <= citation.line_end;

              return (
                <Box
                  key={`${lineNumber}-${line}`}
                  ref={isHighlighted && lineNumber === citation?.line_start ? highlightedRef : null}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "44px 1fr",
                    gap: 1,
                    py: "1px",
                    px: "4px",
                    borderRadius: "3px",
                    backgroundColor: isHighlighted
                      ? "rgba(224,224,224,0.07)"
                      : "transparent",
                    borderLeft: isHighlighted
                      ? "2px solid rgba(224,224,224,0.3)"
                      : "2px solid transparent",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: isHighlighted ? "#6b6b6b" : "#3a3a3a",
                      userSelect: "none",
                      textAlign: "right",
                      lineHeight: "20px",
                    }}
                  >
                    {lineNumber}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: "pre-wrap",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      lineHeight: "20px",
                      color: isHighlighted ? "#ededed" : "#aaa",
                    }}
                  >
                    {line || " "}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

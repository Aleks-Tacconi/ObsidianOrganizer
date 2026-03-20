import type { Note } from "../../../Utils/types/api.schemas";
import { Box, Button, Divider, Link, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import { FaBookOpen, FaChevronDown, FaChevronUp, FaLink } from "react-icons/fa6";
import ReactMarkdown from "react-markdown";

import { getNoteTitleLayout } from "./noteTitleLayout";

type NoteDisplayProps = {
  note: Note;
};

const DESCRIPTION_PREVIEW_LENGTH = 220;
const DESCRIPTION_PREVIEW_LINES = 3;
const DESCRIPTION_COLLAPSED_MAX_HEIGHT = 288;

export default function NoteDisplay({ note }: NoteDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const titleLayout = getNoteTitleLayout({ completed: Boolean(note.completed) });
  const descriptionLineCount = note.description
    ? note.description.split(/\r?\n/).filter((line) => line.trim()).length
    : 0;
  const isDescriptionCollapsible = Boolean(
    note.description
    && (note.description.length > DESCRIPTION_PREVIEW_LENGTH || descriptionLineCount > DESCRIPTION_PREVIEW_LINES),
  );

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems={titleLayout.titleRowAlignItems}
        sx={{ mb: note.description ? 1.5 : 0 }}
        data-testid="note-title-row"
      >
        <Box
          data-testid="note-title-icon"
          sx={{
            width: titleLayout.iconSize,
            height: titleLayout.iconSize,
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            backgroundColor: note.primary_tag?.color ? alpha(note.primary_tag.color, 0.14) : "rgba(255,255,255,0.06)",
            color: note.primary_tag?.color ?? "text.secondary",
            border: note.primary_tag?.color ? `1px solid ${alpha(note.primary_tag.color, 0.32)}` : "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <FaBookOpen size={14} />
        </Box>

        <Typography
          variant={titleLayout.titleVariant}
          sx={{
            fontWeight: 600,
            textDecoration: note.completed ? "line-through" : "none",
            color: note.completed ? "text.secondary" : "text.primary",
            lineHeight: titleLayout.titleLineHeight,
          }}
        >
          {note.name}
        </Typography>
      </Stack>

      {note.description && (
        <Box sx={{ color: "text.primary" }}>
          <Box
            sx={{
              position: "relative",
              maxHeight: expanded || !isDescriptionCollapsible ? "none" : DESCRIPTION_COLLAPSED_MAX_HEIGHT,
              overflow: "hidden",
              mb: isDescriptionCollapsible ? 0.5 : 0,
            }}
          >
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                    {children}
                  </Typography>
                ),
                ul: ({ children }) => (
                  <ul style={{ paddingLeft: "1.4em", margin: "4px 0 12px" }}>{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol style={{ paddingLeft: "1.4em", margin: "4px 0 12px" }}>{children}</ol>
                ),
                li: ({ children }) => (
                  <li style={{ marginBottom: "4px" }}>
                    <Typography variant="body2" component="span">{children}</Typography>
                  </li>
                ),
              }}
            >
              {note.description}
            </ReactMarkdown>

            {!expanded && isDescriptionCollapsible && (
              <Box
                sx={{
                  position: "absolute",
                  inset: "auto 0 0 0",
                  height: 28,
                  background: "linear-gradient(to bottom, rgba(20,20,20,0), rgba(20,20,20,0.72) 72%, #141414 100%)",
                  transition: "background 150ms ease-out",
                  ".MuiCard-root:hover &": {
                    background: "linear-gradient(to bottom, rgba(23,23,23,0), rgba(23,23,23,0.72) 72%, #171717 100%)",
                  },
                  pointerEvents: "none",
                }}
              />
            )}
          </Box>

          {isDescriptionCollapsible && (
            <Button
              variant="text"
              size="small"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              endIcon={expanded ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
              sx={{
                px: 0,
                minWidth: 0,
                textTransform: "none",
                fontWeight: 500,
                color: "text.secondary",
                "&:hover": {
                  backgroundColor: "transparent",
                  color: "text.primary",
                },
              }}
            >
              {expanded ? "Show less" : "Show more"}
            </Button>
          )}
        </Box>
      )}

      {note.urls.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
            Related Resources
          </Typography>
          <Stack spacing={1.5}>
            {note.urls.map((u, i) => (
              <Box
                key={i}
                sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}
              >
                <Box sx={{ pt: "3px", flexShrink: 0, color: "text.secondary" }}>
                  <FaLink size={13} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Link
                    href={u.url}
                    target="_blank"
                    underline="hover"
                    sx={{ fontWeight: 500, fontSize: "0.875rem", color: "text.primary" }}
                  >
                    {u.alias}
                  </Link>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      color: "text.secondary",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      mt: 0.25,
                    }}
                  >
                    {u.url}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

import { motion } from "framer-motion";
import type { Note } from "../../../Utils/types/api.schemas";
import { Box, Button, Divider, Link, Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { FaChevronDown, FaLink } from "react-icons/fa6";
import ReactMarkdown from "react-markdown";

import { motionTransitions } from "../../../Utils/motion";
import { getNoteTitleLayout } from "./noteTitleLayout";

type NoteDisplayProps = {
  note: Note;
};

const DESCRIPTION_COLLAPSED_MAX_HEIGHT = 288;

function startsWithMarkdownHeading(description: string): boolean {
  return /^\s{0,3}#{1,6}\s+\S/.test(description.trimStart());
}

export default function NoteDisplay({ note }: NoteDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const [descriptionHeight, setDescriptionHeight] = useState(0);
  const descriptionContentRef = useRef<HTMLDivElement | null>(null);
  const titleLayout = getNoteTitleLayout({ completed: Boolean(note.completed) });
  const showsLeadingHeading = note.description ? startsWithMarkdownHeading(note.description) : false;
  const showDescriptionLabel = Boolean(note.description && !showsLeadingHeading);
  const isDescriptionCollapsible = descriptionHeight > DESCRIPTION_COLLAPSED_MAX_HEIGHT;

  useEffect(() => {
    if (!note.description) {
      setDescriptionHeight(0);
      return;
    }

    const measureDescriptionHeight = () => {
      setDescriptionHeight(descriptionContentRef.current?.scrollHeight ?? 0);
    };

    measureDescriptionHeight();

    if (typeof ResizeObserver === "undefined" || !descriptionContentRef.current) {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      measureDescriptionHeight();
    });
    observer.observe(descriptionContentRef.current);

    return () => {
      observer.disconnect();
    };
  }, [note.description]);

  return (
    <Box>
      <Stack
        direction="row"
        spacing={0}
        alignItems={titleLayout.titleRowAlignItems}
        sx={{ mb: note.description || note.urls.length > 0 ? 2 : 0 }}
        data-testid="note-title-row"
      >
        <Typography
          variant={titleLayout.titleVariant}
          component="h3"
          sx={{
            fontWeight: 600,
            textDecoration: "none",
            color: note.completed ? "text.secondary" : "text.primary",
            lineHeight: titleLayout.titleLineHeight,
            minWidth: 0,
            textWrap: "balance",
          }}
        >
          {note.name}
        </Typography>
      </Stack>

      {note.description && (
        <Box sx={{ color: "text.primary" }}>
          {showDescriptionLabel && (
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1.5, letterSpacing: "0.12em", textTransform: "uppercase" }}
            >
              Description
            </Typography>
          )}
          <Box
            component={motion.div}
            sx={{
              position: "relative",
              overflow: "hidden",
              mb: isDescriptionCollapsible ? 0.5 : 0,
            }}
            initial={false}
            animate={{
              height: expanded || !isDescriptionCollapsible ? "auto" : DESCRIPTION_COLLAPSED_MAX_HEIGHT,
            }}
            transition={motionTransitions.base}
          >
            <Box ref={descriptionContentRef}>
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <Typography
                      component="h4"
                      sx={{
                        color: "text.primary",
                        mb: 1.5,
                        fontSize: "1.125rem",
                        fontWeight: 600,
                        lineHeight: 1.35,
                        textWrap: "balance",
                      }}
                    >
                      {children}
                    </Typography>
                  ),
                  h2: ({ children }) => (
                    <Typography
                      component="h5"
                      sx={{
                        color: "text.primary",
                        mb: 1.5,
                        fontSize: "1rem",
                        fontWeight: 600,
                        lineHeight: 1.4,
                        textWrap: "balance",
                      }}
                    >
                      {children}
                    </Typography>
                  ),
                  h3: ({ children }) => (
                    <Typography
                      component="h6"
                      sx={{
                        color: "text.primary",
                        mb: 1,
                        fontSize: "0.9375rem",
                        fontWeight: 600,
                        lineHeight: 1.45,
                      }}
                    >
                      {children}
                    </Typography>
                  ),
                  p: ({ children }) => (
                    <Typography variant="body2" component="div" sx={{ mb: 1.5, lineHeight: 1.7 }}>
                      {children}
                    </Typography>
                  ),
                  ul: ({ children }) => (
                    <ul style={{ paddingLeft: "1.4em", margin: "0 0 12px" }}>{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol style={{ paddingLeft: "1.4em", margin: "0 0 12px" }}>{children}</ol>
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
            </Box>
          </Box>

          {isDescriptionCollapsible && (
            <Button
              variant="text"
              size="small"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              endIcon={(
                <Box
                  component={motion.span}
                  initial={false}
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={motionTransitions.base}
                  sx={{ display: "inline-flex" }}
                >
                  <FaChevronDown size={11} />
                </Box>
              )}
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
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1.5, letterSpacing: "0.12em", textTransform: "uppercase" }}
          >
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

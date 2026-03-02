import type { Note } from "../../../Utils/types/api.schemas";
import { Box, Chip, Typography, Stack, Link, Divider } from "@mui/material";
import { FaLink } from "react-icons/fa6";
import ReactMarkdown from "react-markdown";

type NoteDisplayProps = {
  note: Note;
};

export default function NoteDisplay({ note }: NoteDisplayProps) {
  return (
    <Box>
      {/* Title */}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          textDecoration: note.completed ? "line-through" : "none",
          color: note.completed ? "text.secondary" : "text.primary",
          mb: note.subtags.length > 0 ? 1 : note.description ? 1.5 : 0,
        }}
      >
        {note.name}
      </Typography>

      {/* Subtag chips */}
      {note.subtags.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: note.description ? 2 : 0 }}>
          {note.subtags.map((subtag) => (
            <Chip
              key={subtag.id}
              label={subtag.name}
              size="small"
              sx={{
                backgroundColor: "rgba(255,255,255,0.06)",
                color: "text.secondary",
                border: "1px solid rgba(255,255,255,0.08)",
                borderLeft: `2px solid ${note.primary_tag.color}`,
              }}
            />
          ))}
        </Stack>
      )}

      {/* Description */}
      {note.description && (
        <Box sx={{ color: "text.primary" }}>
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
        </Box>
      )}

      {/* Related resources */}
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

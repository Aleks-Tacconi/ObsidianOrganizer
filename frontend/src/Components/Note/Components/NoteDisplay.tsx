import type { Note } from "../../../Utils/types/api.schemas";
import { Box, CardHeader, CardContent, Typography, Stack, Link } from "@mui/material";
import { FaLink } from "react-icons/fa6";
import ReactMarkdown from "react-markdown";

type NoteDisplayProps = {
  note: Note;
};

export default function NoteDisplay({ note }: NoteDisplayProps) {
  return (
    <Box>
      <CardHeader
        sx={{ padding: "8px", marginBottom: "12px" }}
        title={
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {note.name}
          </Typography>
        }
      />
      <CardContent
        sx={{ padding: "8px", paddingTop: 0, marginBottom: 0, paddingBottom: 0, fontSize: "14px" }}
      >
        {note.description && (
          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <Typography variant="body2" component="div">
                  {children}
                </Typography>
              ),
              ul: ({ children }) => (
                <ul style={{ paddingLeft: "1.2em", margin: "8px 0" }}>{children}</ul>
              ),
              ol: ({ children }) => (
                <ol style={{ paddingLeft: "1.2em", margin: "8px 0" }}>{children}</ol>
              ),
            }}
          >
            {note.description}
          </ReactMarkdown>
        )}

        {note.urls.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, marginTop: "32px", mb: 1 }}>
              Related Resources
            </Typography>
            <Stack spacing={1.5}>
              {note.urls.map((u, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                  }}
                >
                  <FaLink size={12} style={{ marginTop: 4, flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Link href={u.url} target="_blank" underline="hover" sx={{ fontWeight: 500 }}>
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
                      }}
                    >
                      {u.url}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </CardContent>
    </Box>
  );
}

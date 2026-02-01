import type { Note } from "../../../Utils/types/api.schemas";
import { Card, CardHeader, CardContent, Typography, Stack, Chip, Box, Link } from "@mui/material";
import { FaLink } from "react-icons/fa6";
import ReactMarkdown from "react-markdown";

type NoteDisplayProps = {
  note: Note;
};

export default function NoteDisplay({ note }: NoteDisplayProps) {
  return (
    <Card variant="outlined" sx={{ border: 0, margin: 0, padding: 0 }}>
      <CardHeader
        sx={{ padding: "5px", marginBottom: "12px" }}
        title={
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {note.name}
          </Typography>
        }
      />
      <CardContent
        sx={{ padding: "5px", paddingTop: 0, marginBottom: 0, paddingBottom: 0, fontSize: "14px" }}
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
                <ul style={{ paddingLeft: "1.2em", margin: "8px" }}>{children}</ul>
              ),
              ol: ({ children }) => (
                <ol style={{ paddingLeft: "1.2em", margin: "8px" }}>{children}</ol>
              ),
            }}
          >
            {note.description}
          </ReactMarkdown>
        )}

        <Typography variant="h5" sx={{ fontWeight: 600, marginTop: "30px" }}>
          Related Resources
        </Typography>
        {note.urls.length > 0 && (
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {note.urls.map((u, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1,
                }}
              >
                <FaLink size={14} style={{ marginTop: 4 }} />

                <Box>
                  <Link href={u.url} target="_blank" underline="hover" sx={{ fontWeight: 500 }}>
                    {u.alias}
                  </Link>

                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                    {u.url}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

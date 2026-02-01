import type { Note } from "../../../Utils/types/api.schemas";
import { Card, CardHeader, CardContent, Typography, Stack, Chip } from "@mui/material";
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
        {note.urls.length > 0 && (
          <Stack direction="column" spacing={1} sx={{ marginTop: "15px" }}>
            {note.urls.map((u, i) => (
              <Chip
                key={i}
                icon={<FaLink color="#0080FF" size={16} />}
                label={`${u.alias} (${u.url})`}
                component="a"
                href={u.url}
                target="_blank"
                clickable
                sx={{
                  paddingLeft: "5px",
                  color: "#0080FF",
                  width: "auto",
                  justifyContent: "flex-start",
                }}
              />
            ))}
          </Stack>
        )}{" "}
      </CardContent>
    </Card>
  );
}

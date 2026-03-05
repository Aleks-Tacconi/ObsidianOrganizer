import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

import type { RAGCitation } from "../../Utils/api";

export type ChatMessageItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: RAGCitation[];
};

type ChatMessageProps = {
  message: ChatMessageItem;
  onCitationClick: (citation: RAGCitation) => void;
};

export default function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <Stack alignItems={isUser ? "flex-end" : "flex-start"}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: "85%",
          p: 2,
          backgroundColor: isUser ? "rgba(224,224,224,0.06)" : "#141414",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "6px",
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
          {message.content}
        </Typography>

        {!isUser && (message.citations?.length ?? 0) > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography
              variant="caption"
              sx={{ color: "#6b6b6b", display: "block", mb: 1 }}
            >
              Sources
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {message.citations?.map((citation) => (
                <Chip
                  key={`${citation.file_path}-${citation.line_start}`}
                  label={`${citation.file_name}:${citation.line_start}`}
                  size="small"
                  onClick={() => onCitationClick(citation)}
                  sx={{
                    height: "24px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    color: "#ededed",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "rgba(255,255,255,0.09)",
                    },
                  }}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}

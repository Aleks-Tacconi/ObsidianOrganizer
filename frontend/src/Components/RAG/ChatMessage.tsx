import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

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
        {isUser ? (
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {message.content}
          </Typography>
        ) : (
          <Box sx={{ fontSize: "0.875rem" }}>
            <ReactMarkdown
              remarkPlugins={[remarkBreaks, remarkGfm]}
              components={{
                p: ({ children }) => (
                  <Typography variant="body2" component="p" sx={{ m: 0, mb: 1.25, lineHeight: 1.7 }}>
                    {children}
                  </Typography>
                ),
                ul: ({ children }) => <Box component="ul" sx={{ pl: 2.5, my: 1 }}>{children}</Box>,
                ol: ({ children }) => <Box component="ol" sx={{ pl: 2.5, my: 1 }}>{children}</Box>,
                li: ({ children }) => (
                  <Typography component="li" variant="body2" sx={{ mb: 0.5, lineHeight: 1.6 }}>
                    {children}
                  </Typography>
                ),
                code: ({ children }) => (
                  <Box
                    component="code"
                    sx={{
                      fontFamily: "monospace",
                      fontSize: "0.8rem",
                      backgroundColor: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "4px",
                      px: 0.5,
                      py: 0.2,
                    }}
                  >
                    {children}
                  </Box>
                ),
                pre: ({ children }) => (
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      my: 1,
                      p: 1.5,
                      overflowX: "auto",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "6px",
                      backgroundColor: "rgba(255,255,255,0.03)",
                    }}
                  >
                    {children}
                  </Box>
                ),
                table: ({ children }) => (
                  <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", my: 1 }}>
                    {children}
                  </Box>
                ),
                th: ({ children }) => (
                  <Box
                    component="th"
                    sx={{
                      border: "1px solid rgba(255,255,255,0.08)",
                      px: 1,
                      py: 0.75,
                      textAlign: "left",
                      fontSize: "0.8rem",
                    }}
                  >
                    {children}
                  </Box>
                ),
                td: ({ children }) => (
                  <Box
                    component="td"
                    sx={{ border: "1px solid rgba(255,255,255,0.08)", px: 1, py: 0.75, fontSize: "0.85rem" }}
                  >
                    {children}
                  </Box>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </Box>
        )}

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

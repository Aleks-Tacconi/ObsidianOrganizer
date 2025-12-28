import { Dialog, DialogTitle, DialogContent, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";

function wikilinksToTokens(text: string) {
  return text.replace(/\[\[([^\]]+)\]\]/g, (_, name) => {
    return `<wikilink>${name}</wikilink>`;
  });
}

export default function ObsidianFileDialog({
  open,
  onClose,
  file,
  onWikiLink,
}: {
  open: boolean;
  onClose: () => void;
  file: { name: string; content: string } | null;
  onWikiLink: (name: string) => void;
}) {
  if (!file) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{file.name}</DialogTitle>
      <DialogContent dividers>
        <ReactMarkdown
          remarkPlugins={[remarkBreaks]}
          rehypePlugins={[rehypeRaw]}
          components={{
            wikilink: ({ children }) => {
              const name = String(children);

              return (
                <Typography
                  component="span"
                  sx={{
                    color: "#7b5cff",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                  onClick={() => onWikiLink(name)}
                >
                  {children}
                </Typography>
              );
            },
          }}
        >
          {wikilinksToTokens(file.content)}
        </ReactMarkdown>
      </DialogContent>
    </Dialog>
  );
}

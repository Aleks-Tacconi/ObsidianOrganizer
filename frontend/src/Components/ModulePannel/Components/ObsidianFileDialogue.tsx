import { Dialog, DialogTitle, DialogContent, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

function wikilinksToMarkdown(text: string) {
  return text.replace(/\[\[([^\]]+)\]\]/g, (_, name) => {
    return `[${name}](wikilink:${name})`;
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
          components={{
            a: ({ href, children }) => {
              if (href?.startsWith("wikilink:")) {
                const noteName = href.replace("wikilink:", "");

                return (
                  <Typography
                    component="span"
                    sx={{
                      color: "#7b5cff",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      onWikiLink(noteName);
                    }}
                  >
                    {children}
                  </Typography>
                );
              }

              return <a href={href}>{children}</a>;
            },
          }}
        >
          {wikilinksToMarkdown(file.content)}
        </ReactMarkdown>
      </DialogContent>
    </Dialog>
  );
}

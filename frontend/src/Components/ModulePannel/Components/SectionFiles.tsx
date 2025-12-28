import { useEffect, useState } from "react";
import { Stack, Typography } from "@mui/material";

import api from "../../../Utils/api";
import ObsidianFileDialog from "./ObsidianFileDialogue";

export default function SectionFiles({
  primaryTagName,
  subtagName,
}: {
  primaryTagName: string;
  subtagName: string;
}) {
  const [files, setFiles] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeFile, setActiveFile] = useState<any>(null);

  const openFile = (path: string) => {
    api.post("obsidian-file/", { path }).then((res) => {
      if (res != undefined) {
        setActiveFile(res.data);
        setOpen(true);
      }
    });
  };

  const openWikiLink = (name: string) => {
    api.post("obsidian-file-by-name/", { name }).then((res) => {
      if (res) {
        setActiveFile(res.data);
        setOpen(true);
      }
    });
  };

  useEffect(() => {
    api
      .post<{ files: string[] }>("match-tags/", {
        tags: [primaryTagName, subtagName],
      })
      .then((res) => {
        if (res != undefined) {
          setFiles(res.data.files);
        }
      });
  }, [primaryTagName, subtagName]);

  if (files.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No files
      </Typography>
    );
  }

  return (
    <>
      <Stack spacing={0.5}>
        {files.map((file) => (
          <Typography
            key={file}
            variant="body2"
            sx={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => openFile(file)}
          >
            {file.split("/").pop()}
          </Typography>
        ))}
      </Stack>

      <ObsidianFileDialog
        open={open}
        onClose={() => setOpen(false)}
        file={activeFile}
        onWikiLink={openWikiLink}
      />
    </>
  );
}

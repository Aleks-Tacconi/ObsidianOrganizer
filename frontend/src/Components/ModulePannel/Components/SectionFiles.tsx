import { useEffect, useRef, useState } from "react";
import { List, ListItemIcon, ListItemText, Stack, ListItemButton } from "@mui/material";
import api from "../../../Utils/api";
import ObsidianFileDialog, { type ObsidianFileDialogHandle } from "./ObsidianFileDialog";
import { FaRegStickyNote } from "react-icons/fa";

export default function SectionFiles({
  primaryTagName,
  subtagName,
}: {
  primaryTagName: string;
  subtagName: string;
}) {
  const [files, setFiles] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  const dialogRef = useRef<ObsidianFileDialogHandle>(null);

  const openFile = (path: string) => {
    api.post("obsidian-file/", { path }).then((res) => {
      if (res?.data) {
        setActiveFile(res.data);
        setOpen(true);
        dialogRef.current?.navigate(res.data);
      }
    });
  };

  const openWikiLink = (name: string) => {
    api.post("obsidian-file-by-name/", { name }).then((res) => {
      if (res?.data) {
        setActiveFile(res.data);
        setOpen(true);
        dialogRef.current?.navigate(res.data);
      }
    });
  };

  const refreshFile = () => {
    if (!activeFile) return;
    api.post("obsidian-file-by-name/", { name: activeFile.name }).then((res) => {
      if (res?.data) {
        setActiveFile(res.data);
        dialogRef.current?.refreshCurrent(res.data); // refresh in-place
      }
    });
  };

  useEffect(() => {
    api
      .post<{ files: string[] }>("match-tags/", { tags: [primaryTagName, subtagName] })
      .then((res) => {
        if (res?.data) setFiles(res.data.files);
      });
  }, [primaryTagName, subtagName]);

  if (files.length === 0) {
    return;
  }

  return (
    <>
      <Stack spacing={1} sx={{ marginLeft: "32px" }}>
        <List>
          {files.map((file) => {
            const fileName = file.split("/").pop();
            return (
              <ListItemButton
                key={file}
                onClick={() => openFile(file)}
                sx={{ py: 1 }} // vertical padding
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <FaRegStickyNote size={20} />
                </ListItemIcon>
                <ListItemText
                  primary={fileName}
                  primaryTypographyProps={{ fontSize: "1rem", fontWeight: 500 }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Stack>

      {activeFile && (
        <ObsidianFileDialog
          ref={dialogRef}
          open={open}
          onClose={() => setOpen(false)}
          file={activeFile}
          onWikiLink={openWikiLink}
          onRefresh={refreshFile}
        />
      )}
    </>
  );
}

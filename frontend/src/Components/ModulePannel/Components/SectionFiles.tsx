import { useEffect, useRef, useState } from "react";
import { List, ListItemIcon, ListItemText, ListItemButton, Skeleton, Stack, Typography } from "@mui/material";
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
  const [activeFile, setActiveFile] = useState<{ name: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileError, setFileError] = useState<string | null>(null);
  const dialogRef = useRef<ObsidianFileDialogHandle>(null);

  const openFile = (path: string) => {
    setFileError(null);
    api
      .post<{ name: string; content: string }>("obsidian-file/", { path })
      .then((res) => {
        if (res?.data) {
          setActiveFile(res.data);
          setOpen(true);
          dialogRef.current?.navigate(res.data);
        }
      })
      .catch(() => setFileError("Could not open file."));
  };

  const openWikiLink = (name: string) => {
    setFileError(null);
    api
      .post<{ name: string; content: string }>("obsidian-file-by-name/", { name })
      .then((res) => {
        if (res?.data) {
          setActiveFile(res.data);
          setOpen(true);
          dialogRef.current?.navigate(res.data);
        }
      })
      .catch(() => setFileError("Could not open linked file."));
  };

  const refreshFile = () => {
    if (!activeFile) return;
    api
      .post<{ name: string; content: string }>("obsidian-file-by-name/", { name: activeFile.name })
      .then((res) => {
        if (res?.data) {
          setActiveFile(res.data);
          dialogRef.current?.refreshCurrent(res.data);
        }
      })
      .catch(() => setFileError("Could not refresh file."));
  };

  useEffect(() => {
    setLoading(true);
    api
      .post<{ files: string[] }>("match-tags/", { tags: [primaryTagName, subtagName] })
      .then((res) => {
        if (res?.data) setFiles(res.data.files);
      })
      .catch(() => {
        // silently ignore — no notes column is fine
      })
      .finally(() => setLoading(false));
  }, [primaryTagName, subtagName]);

  if (loading) {
    return (
      <Stack spacing={1}>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
      </Stack>
    );
  }

  if (files.length === 0) {
    return null;
  }

  return (
    <>
      {fileError && (
        <Typography variant="caption" color="error" sx={{ mb: 1, display: "block" }}>
          {fileError}
        </Typography>
      )}
      <List dense disablePadding>
        {files.map((file) => {
          const fileName = file.split("/").pop()?.replace(/\.md$/, "") ?? file;
          return (
            <ListItemButton
              key={file}
              onClick={() => openFile(file)}
              sx={{ py: 1, borderRadius: "6px" }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                <FaRegStickyNote size={16} />
              </ListItemIcon>
              <ListItemText
                primary={fileName}
                primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 500 }}
              />
            </ListItemButton>
          );
        })}
      </List>

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

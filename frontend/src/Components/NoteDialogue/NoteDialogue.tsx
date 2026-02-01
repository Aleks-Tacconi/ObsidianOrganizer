import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  Stack,
  IconButton,
} from "@mui/material";

import api from "../../Utils/api";
import type { SubTag, NoteURL, Note as NoteType } from "../../Utils/types/api.schemas";
import ConfirmDialogue from "../ConfirmDialogue/ConfirmDialogue";
import { FaTrash } from "react-icons/fa6";

interface Props {
  open: boolean;
  onClose: () => void;
  primaryTagId: number;
  note?: NoteType;
  onSaved: (note: NoteType) => void;
}

type NewNoteURL = Omit<NoteURL, "id">;

export default function NoteDialog({ open, onClose, primaryTagId, note, onSaved }: Props) {
  const [name, setName] = useState(note?.name ?? "");
  const [description, setDescription] = useState(note?.description ?? "");
  const [completed, setCompleted] = useState(note?.completed ?? false);

  const [date, setDate] = useState(
    note ? new Date(note.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
  );

  const [subtags, setSubtags] = useState<SubTag[]>([]);
  const [selectedSubtags, setSelectedSubtags] = useState<SubTag[]>(note?.subtags ?? []);

  const [urls, setUrls] = useState<NewNoteURL[]>(
    note ? note.urls.map((u) => ({ alias: u.alias, url: u.url })) : [],
  );

  const [urlAlias, setUrlAlias] = useState("");
  const [urlValue, setUrlValue] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [urlToDelete, setUrlToDelete] = useState<number | null>(null);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCompleted(false);
    setDate(new Date().toISOString().slice(0, 16));
    setSelectedSubtags([]);
    setUrls([]);
    setUrlAlias("");
    setUrlValue("");
  };

  useEffect(() => {
    if (!open) return;
    if (!note) resetForm();
  }, [open, note]);

  useEffect(() => {
    if (!open || !note) return;

    setName(note.name);
    setDescription(note.description ?? "");
    setCompleted(note.completed);
    setDate(new Date(note.date).toISOString().slice(0, 16));
    setSelectedSubtags(note.subtags ?? []);
    setUrls(note.urls.map((u) => ({ alias: u.alias, url: u.url })));
    setUrlAlias("");
    setUrlValue("");
  }, [open, note]);

  useEffect(() => {
    api.get<SubTag[]>("subtags/").then((r) => r && setSubtags(r.data));
  }, []);

  const handleAddUrl = () => {
    if (!urlAlias || !urlValue) return;
    setUrls((p) => [...p, { alias: urlAlias, url: urlValue }]);
    setUrlAlias("");
    setUrlValue("");
  };

  const updateUrl = (index: number, key: "alias" | "url", value: string) => {
    setUrls((prev) => prev.map((u, i) => (i === index ? { ...u, [key]: value } : u)));
  };

  const requestDeleteUrl = (index: number) => {
    setUrlToDelete(index);
    setConfirmOpen(true);
  };

  const confirmDeleteUrl = () => {
    if (urlToDelete === null) return;
    setUrls((p) => p.filter((_, i) => i !== urlToDelete));
    setUrlToDelete(null);
    setConfirmOpen(false);
  };

  const handleSubmit = async () => {
    const urls_ids: number[] = [];

    for (const u of urls) {
      const res = await api.post<NoteURL>("urls/", u);
      if (res) urls_ids.push(res.data.id);
    }

    const payload = {
      name,
      description,
      date: new Date(date).toISOString(),
      completed,
      primary_tag_id: primaryTagId,
      subtags_ids: selectedSubtags.map((s) => s.id),
      urls_ids,
    };

    if (note) {
      await api.put<NoteType>(`notes/${note.id}/`, payload).then((res) => {
        if (res) onSaved(res.data);
      });
    } else {
      await api.post<NoteType>("notes/", payload).then((res) => {
        if (res) onSaved(res.data);
      });
    }

    resetForm();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{note ? "Edit Note" : "Create Note"}</DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
          />

          <Autocomplete
            multiple
            options={subtags.filter((s) => s.parent === primaryTagId)}
            getOptionLabel={(o) => o.name}
            value={selectedSubtags}
            onChange={(_, v) => setSelectedSubtags(v)}
            renderInput={(params) => <TextField {...params} label="Subtags" />}
          />

          <Stack direction="row" spacing={1}>
            <TextField
              label="URL Alias"
              value={urlAlias}
              onChange={(e) => setUrlAlias(e.target.value)}
              fullWidth
            />
            <TextField
              label="URL"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              fullWidth
            />
            <Button onClick={handleAddUrl}>Add</Button>
          </Stack>

          {urls.length > 0 && (
            <Stack spacing={1}>
              {urls.map((u, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center">
                  <TextField
                    label="Alias"
                    value={u.alias}
                    onChange={(e) => updateUrl(i, "alias", e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="URL"
                    value={u.url}
                    onChange={(e) => updateUrl(i, "url", e.target.value)}
                    fullWidth
                  />
                  <IconButton onClick={() => requestDeleteUrl(i)} sx={{padding: "12px 24px"}}>
                    <FaTrash size={16}/>
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}

          <FormControlLabel
            control={
              <Checkbox checked={completed} onChange={(e) => setCompleted(e.target.checked)} />
            }
            label="Completed"
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={selectedSubtags.length === 0}
          >
            {note ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialogue
        open={confirmOpen}
        title="Remove URL"
        message="Are you sure you want to remove this URL?"
        onConfirm={confirmDeleteUrl}
        onDecline={() => {
          setConfirmOpen(false);
          setUrlToDelete(null);
        }}
      />
    </>
  );
}

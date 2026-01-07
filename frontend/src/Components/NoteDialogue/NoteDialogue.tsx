import { useEffect, useState } from "react";
import {
  Chip,
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
} from "@mui/material";

import api from "../../Utils/api";
import type { SubTag, NoteURL, Note as NoteType } from "../../Utils/types/api.schemas";

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

  useEffect(() => {
    api.get<SubTag[]>("subtags/").then((r) => r && setSubtags(r.data));
  }, []);

  const handleAddUrl = () => {
    if (!urlAlias || !urlValue) return;
    setUrls((p) => [...p, { alias: urlAlias, url: urlValue }]);
    setUrlAlias("");
    setUrlValue("");
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
      const res = await api.put<NoteType>(`notes/${note.id}/`, payload);
      onSaved(res.data);
    } else {
      const res = await api.post<NoteType>("notes/", payload);
      onSaved(res.data);
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{note ? "Edit Note" : "Create Note"}</DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          sx={{
            marginTop: "5px",
          }}
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={3}
        />

        <TextField
          label="Date & Time"
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <Autocomplete
          multiple
          options={subtags.filter((s) => s.parent === primaryTagId)} // filter by parent
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
          <Stack direction="column" spacing={1} flexWrap="wrap">
            {urls.map((u, i) => (
              <Chip
                key={i}
                label={`${u.alias} — ${u.url}`}
                onDelete={() => setUrls((p) => p.filter((_, idx) => idx !== i))}
              />
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

        <Button variant="contained" onClick={handleSubmit} disabled={selectedSubtags.length === 0}>
          {note ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

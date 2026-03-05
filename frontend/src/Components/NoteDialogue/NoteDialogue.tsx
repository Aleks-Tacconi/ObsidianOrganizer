import { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import api from "../../Utils/api";
import type { SubTag, NoteURL, Note as NoteType } from "../../Utils/types/api.schemas";
import { FaTrash } from "react-icons/fa6";

interface Props {
  open: boolean;
  onClose: () => void;
  primaryTagId: number;
  tagColor?: string;
  note?: NoteType;
  onSaved: (note: NoteType) => void;
  refresh?: number;
}

type LocalURL = { alias: string; url: string; id?: number };

export default function NoteDialog({ open, onClose, primaryTagId, tagColor, note, onSaved, refresh }: Props) {
  const [name, setName] = useState(note?.name ?? "");
  const [description, setDescription] = useState(note?.description ?? "");
  const [completed, setCompleted] = useState(note?.completed ?? false);
  const [date, setDate] = useState(
    note ? new Date(note.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
  );
  const [subtags, setSubtags] = useState<SubTag[]>([]);
  const [selectedSubtags, setSelectedSubtags] = useState<SubTag[]>(note?.subtags ? [...note.subtags] : []);
  const [urls, setUrls] = useState<LocalURL[]>(
    note ? note.urls.map((u) => ({ alias: u.alias, url: u.url, id: u.id })) : [],
  );
  const [urlAlias, setUrlAlias] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [urlError, setUrlError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subtouched, setSubtouched] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCompleted(false);
    setDate(new Date().toISOString().slice(0, 16));
    setSelectedSubtags([]);
    setUrls([]);
    setUrlAlias("");
    setUrlValue("");
    setError(null);
    setSubtouched(false);
  };

  useEffect(() => {
    if (!open) return;
    if (!note) {
      resetForm();
    } else {
      setName(note.name);
      setDescription(note.description ?? "");
      setCompleted(note.completed ?? false);
      setDate(new Date(note.date).toISOString().slice(0, 16));
      setSelectedSubtags([...note.subtags]);
      setUrls(note.urls.map((u) => ({ alias: u.alias, url: u.url, id: u.id })));
      setUrlAlias("");
      setUrlValue("");
      setError(null);
      setSubtouched(false);
    }
  }, [open, note]);

  useEffect(() => {
    if (open) {
      api.get<SubTag[]>("subtags/").then((r) => r && setSubtags(r.data));
    }
  }, [open, primaryTagId, refresh]);

  const handleAddUrl = () => {
    if (!urlAlias.trim() || !urlValue.trim()) {
      setUrlError(true);
      return;
    }
    setUrlError(false);
    setUrls((p) => [...p, { alias: urlAlias.trim(), url: urlValue.trim() }]);
    setUrlAlias("");
    setUrlValue("");
  };

  const removeUrl = (index: number) => {
    setUrls((p) => p.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, key: "alias" | "url", value: string) => {
    setUrls((prev) => prev.map((u, i) => (i === index ? { ...u, [key]: value } : u)));
  };

  const handleSubmit = async () => {
    if (primaryTagId === 0) {
      setError("Cannot save: no module selected.");
      return;
    }

    if (selectedSubtags.length === 0) {
      setSubtouched(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const urls_ids: number[] = [];

      for (const u of urls) {
        if (u.id) {
          // existing URL — update in place
          const res = await api.put<NoteURL>(`urls/${u.id}/`, { alias: u.alias, url: u.url });
          if (res) urls_ids.push(res.data.id);
        } else {
          // new URL — create
          const res = await api.post<NoteURL>("urls/", { alias: u.alias, url: u.url });
          if (res) urls_ids.push(res.data.id);
        }
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
    } catch {
      setError("Failed to save. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = selectedSubtags.length > 0 && name.trim().length > 0 && !submitting;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{note ? "Edit Note" : "New Note"}</DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          sx={{ marginTop: 1 }}
        />

        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={6}
        />

        <Autocomplete
          multiple
          options={subtags.filter((s) => s.parent === primaryTagId)}
          getOptionLabel={(o) => o.name}
          value={selectedSubtags}
          onChange={(_, v) => setSelectedSubtags(v)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                {...getTagProps({ index })}
                key={option.id}
                label={option.name}
                size="small"
                sx={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  color: "text.secondary",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderLeft: `2px solid ${tagColor ?? "#e0e0e0"}`,
                }}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Categories"
              required
              error={subtouched && selectedSubtags.length === 0}
              helperText={subtouched && selectedSubtags.length === 0 ? "At least one category is required" : ""}
            />
          )}
        />

        <Stack direction="row" spacing={1}>
          <TextField
            label="Link label"
            value={urlAlias}
            onChange={(e) => { setUrlAlias(e.target.value); setUrlError(false); }}
            fullWidth
            error={urlError && !urlAlias.trim()}
            helperText={urlError && !urlAlias.trim() ? "Required" : ""}
          />
          <TextField
            label="URL"
            value={urlValue}
            onChange={(e) => { setUrlValue(e.target.value); setUrlError(false); }}
            fullWidth
            error={urlError && !urlValue.trim()}
            helperText={urlError && !urlValue.trim() ? "Required" : ""}
          />
          <Button onClick={handleAddUrl} sx={{ whiteSpace: "nowrap", alignSelf: "flex-start", mt: "4px" }}>
            Add
          </Button>
        </Stack>

        {urls.length > 0 && (
          <Stack spacing={1}>
            {urls.map((u, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField
                  label="Label"
                  value={u.alias}
                  onChange={(e) => updateUrl(i, "alias", e.target.value)}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="URL"
                  value={u.url}
                  onChange={(e) => updateUrl(i, "url", e.target.value)}
                  fullWidth
                  size="small"
                />
                <Tooltip title="Remove link">
                  <IconButton
                    onClick={() => removeUrl(i)}
                    aria-label="Remove link"
                    size="small"
                    sx={{ padding: "8px" }}
                  >
                    <FaTrash size={14} />
                  </IconButton>
                </Tooltip>
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

        {selectedSubtags.length === 0 && subtouched && (
          <Typography variant="caption" color="error">
            Select at least one category to enable saving.
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Tooltip title={selectedSubtags.length === 0 ? "Select at least one category to save" : ""}>
          <span>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!canSubmit}
              startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : null}
            >
              {submitting ? "Saving…" : note ? "Save" : "Create"}
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
}

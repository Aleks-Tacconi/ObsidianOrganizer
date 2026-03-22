import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Alert,
  Autocomplete,
  Box,
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
import { FaHeading, FaListUl, FaPlus, FaTrash } from "react-icons/fa6";
import { dialogContentVariants } from "../../Utils/motion";
import { applyLinePrefix } from "./descriptionEditor";

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
  const [descriptionDraft, setDescriptionDraft] = useState(note?.description ?? "");
  const [descriptionEditorOpen, setDescriptionEditorOpen] = useState(false);
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
  const descriptionEditorRef = useRef<HTMLTextAreaElement | null>(null);

  const resetForm = () => {
    setName("");
    setDescription("");
    setDescriptionDraft("");
    setDescriptionEditorOpen(false);
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
      setDescriptionDraft(note.description ?? "");
      setDescriptionEditorOpen(false);
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

  const openDescriptionEditor = () => {
    setDescriptionDraft(description);
    setDescriptionEditorOpen(true);
  };

  const saveDescriptionEditor = () => {
    setDescription(descriptionDraft);
    setDescriptionEditorOpen(false);
  };

  const cancelDescriptionEditor = () => {
    setDescriptionDraft(description);
    setDescriptionEditorOpen(false);
  };

  const applyDescriptionFormat = (prefix: string) => {
    const input = descriptionEditorRef.current;
    if (!input) {
      setDescriptionDraft((current) => `${prefix}${current}`);
      return;
    }

    const next = applyLinePrefix(
      descriptionDraft,
      input.selectionStart ?? 0,
      input.selectionEnd ?? 0,
      prefix,
    );

    setDescriptionDraft(next.value);

    window.requestAnimationFrame(() => {
      descriptionEditorRef.current?.focus();
      descriptionEditorRef.current?.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  };

  return (
    <Dialog
      open={open}
      onClose={descriptionEditorOpen ? cancelDescriptionEditor : onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          display: "flex",
          flexDirection: "column",
          height: descriptionEditorOpen ? "78vh" : undefined,
          maxHeight: descriptionEditorOpen ? "78vh" : undefined,
          transition: "height 180ms ease-out",
        },
      }}
    >
      <Stack component={motion.div} variants={dialogContentVariants} initial="hidden" animate="visible" sx={{ height: "100%" }}>
        <DialogTitle sx={{ pb: 1 }}>{descriptionEditorOpen ? "Edit Description" : note ? "Edit Note" : "New Note"}</DialogTitle>

        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            mt: 1,
            minHeight: 0,
            flex: descriptionEditorOpen ? 1 : "0 1 auto",
          }}
        >
          {descriptionEditorOpen ? (
            <Stack spacing={3} sx={{ flex: 1, minHeight: 0 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button size="small" variant="outlined" color="inherit" onClick={() => applyDescriptionFormat("# ")}
                    sx={{ textTransform: "none" }} startIcon={<FaHeading size={12} />}>
                    H1
                  </Button>
                  <Button size="small" variant="outlined" color="inherit" onClick={() => applyDescriptionFormat("## ")}
                    sx={{ textTransform: "none" }} startIcon={<FaHeading size={12} />}>
                    H2
                  </Button>
                  <Button size="small" variant="outlined" color="inherit" onClick={() => applyDescriptionFormat("- ")}
                    sx={{ textTransform: "none" }} startIcon={<FaListUl size={12} />}>
                    Bullet
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Markdown shortcuts for quick structure
                </Typography>
              </Stack>

              <TextField
                label="Description"
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                multiline
                fullWidth
                minRows={18}
                inputRef={descriptionEditorRef}
                sx={{
                  flex: 1,
                  minHeight: 0,
                  "& .MuiInputBase-root": {
                    height: "100%",
                    alignItems: "stretch",
                  },
                  "& .MuiInputBase-inputMultiline": {
                    height: "100% !important",
                    overflowY: "auto !important",
                  },
                }}
              />
            </Stack>
          ) : (
            <Stack spacing={3} sx={{ pt: 1.5 }}>
              {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <Box>
                <Typography variant="subtitle2" color="text.primary" sx={{ mb: 1, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Name
                </Typography>
                <TextField
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  fullWidth
                  size="small"
                  placeholder="Enter note title"
                />
              </Box>

              <Box
                sx={{
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "6px",
                  backgroundColor: "rgba(255,255,255,0.02)",
                  p: 2,
                }}
              >
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.primary" sx={{ mb: 0.5, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Description
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Open the full markdown editor to write longer notes and apply formatting.
                    </Typography>
                  </Box>
                  <Button
                    type="button"
                    onClick={openDescriptionEditor}
                    aria-label="Open description editor"
                    variant="outlined"
                    color="inherit"
                    sx={{ textTransform: "none", flexShrink: 0 }}
                  >
                    {description.trim() ? "Edit description" : "Add description"}
                  </Button>
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.primary" sx={{ mb: 1, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Categories
                </Typography>
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
                      required
                      size="small"
                      placeholder="Select categories"
                      error={subtouched && selectedSubtags.length === 0}
                      helperText={subtouched && selectedSubtags.length === 0 ? "At least one category is required" : ""}
                    />
                  )}
                />
              </Box>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.primary" sx={{ mb: 0.5 }}>
                    Resources
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add links for recordings, slides, or supporting references.
                  </Typography>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
                  <TextField
                    label="Link label"
                    value={urlAlias}
                    onChange={(e) => { setUrlAlias(e.target.value); setUrlError(false); }}
                    fullWidth
                    size="small"
                    error={urlError && !urlAlias.trim()}
                    helperText={urlError && !urlAlias.trim() ? "Required" : ""}
                  />
                  <TextField
                    label="URL"
                    value={urlValue}
                    onChange={(e) => { setUrlValue(e.target.value); setUrlError(false); }}
                    fullWidth
                    size="small"
                    error={urlError && !urlValue.trim()}
                    helperText={urlError && !urlValue.trim() ? "Required" : ""}
                  />
                  <Tooltip title="Add link">
                    <IconButton
                      onClick={handleAddUrl}
                      aria-label="Add link"
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "6px",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "text.secondary",
                        flexShrink: 0,
                        mt: { xs: 0, sm: 0.5 },
                        "&:hover": {
                          borderColor: "rgba(255,255,255,0.2)",
                          backgroundColor: "rgba(255,255,255,0.04)",
                          color: "text.primary",
                        },
                      }}
                    >
                      <FaPlus size={14} />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {urls.length > 0 && (
                  <Stack spacing={1}>
                    {urls.map((u, i) => (
                      <Stack
                        key={i}
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "stretch", sm: "center" }}
                        sx={{
                          p: 1.5,
                          borderRadius: "6px",
                          backgroundColor: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
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
                            sx={{ alignSelf: { xs: "flex-end", sm: "center" }, padding: "8px" }}
                          >
                            <FaTrash size={14} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Stack>

              <Box>
                <Typography variant="subtitle2" color="text.primary" sx={{ mb: 1, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Status
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
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
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          {descriptionEditorOpen ? (
            <>
              <Button onClick={cancelDescriptionEditor}>
                Cancel
              </Button>
              <Button variant="contained" onClick={saveDescriptionEditor}>
                Save description
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
        </DialogActions>
      </Stack>
    </Dialog>
  );
}

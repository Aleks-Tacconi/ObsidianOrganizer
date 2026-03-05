import { useState, useRef } from "react";
import { FaPlus } from "react-icons/fa6";

import SubtagItem from "../SubtagItem/SubtagItem";

import api from "../../../../Utils/api";
import type { PrimaryTag, SubTag } from "../../../../Utils/types/api.schemas.ts";

import "./TagPopup.css";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

type Props = {
  tag: PrimaryTag | null;
  onClose: () => void;
  onSave: (tag: Omit<PrimaryTag, "id"> & { id?: number }) => void;
};

export default function TagPopup({ tag, onClose, onSave }: Props) {
  const [name, setName] = useState(tag?.name || "");
  const [color, setColor] = useState(tag?.color || "#e0e0e0");
  const [subtags, setSubtags] = useState<readonly SubTag[]>(tag?.subtags || []);
  const [deleteQue, setDeleteQue] = useState<number[]>([]);
  const [subtagToDelete, setSubtagToDelete] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorInputRef = useRef<HTMLInputElement | null>(null);

  const addSubtag = () => {
    if (tag != null) {
      setSubtags([...subtags, { id: -1, name: "", parent: tag?.id }]);
    } else {
      setSubtags([...subtags, { id: -1, name: "", parent: NaN }]);
    }
  };

  const removeSubtag = (index: number) => {
    const toDelete = subtags.at(index);
    if (toDelete != null) {
      setDeleteQue([...deleteQue, toDelete.id]);
    }
    setSubtags(subtags.filter((_, i) => i !== index));
    setSubtagToDelete(null);
  };

  const updateSubtag = (index: number, updatedName: string) => {
    const copy = [...subtags];
    copy[index] = { ...copy[index], name: updatedName };
    setSubtags(copy);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (tag) {
        // Existing module — subtags can be saved immediately (parent id is known)
        for (const subtag of subtags) {
          const st = { name: subtag.name, parent: tag.id };
          if (subtag.id !== -1) {
            await api.put<SubTag>(`subtags/${subtag.id}/`, st);
          } else {
            await api.post<SubTag>("subtags/", st);
          }
        }

        for (const toDelete of deleteQue) {
          await api.del(`subtags/${toDelete}/`);
        }
      }
      // For new modules, subtag creation is deferred to TagList.saveTag
      // which creates the primary tag first, then creates subtags with the real parent id.

      onSave({ ...tag, name, color, subtags });
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{tag ? "Edit Module" : "New Module"}</DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "16px", mt: 1 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <TextField
            label="Module Name"
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ flex: 1 }}
            required
          />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <Typography variant="caption" color="text.secondary">
              Color
            </Typography>
            <Tooltip title="Pick color">
              <div
                onClick={() => colorInputRef.current?.click()}
                role="button"
                aria-label="Pick tag color"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "6px",
                  backgroundColor: color,
                  cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.07)",
                  flexShrink: 0,
                }}
              />
            </Tooltip>
            <input
              ref={colorInputRef}
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {subtags.map((subtag, i) => (
            <SubtagItem
              key={i}
              subtag={subtag}
              onChange={(updatedName) => updateSubtag(i, updatedName)}
              onRemove={() => setSubtagToDelete(i)}
            />
          ))}

          <Button variant="outlined" startIcon={<FaPlus />} onClick={addSubtag}>
            Add Category
          </Button>
        </div>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>

      {subtagToDelete !== null && (
        <Dialog
          open
          onClose={() => setSubtagToDelete(null)}
          maxWidth="xs"
          BackdropProps={{ style: { backgroundColor: "rgba(0,0,0,0.08)" } }}
          PaperProps={{
            sx: { backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.07)" },
          }}
        >
          <DialogTitle>Remove category?</DialogTitle>
          <DialogContent>
            <Typography>
              Remove &ldquo;{subtags[subtagToDelete]?.name || "this category"}&rdquo;?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSubtagToDelete(null)}>Cancel</Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => removeSubtag(subtagToDelete)}
              autoFocus
            >
              Remove
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Dialog>
  );
}

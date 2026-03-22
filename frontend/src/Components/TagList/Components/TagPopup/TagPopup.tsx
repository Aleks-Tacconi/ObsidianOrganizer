import { useRef, useState } from "react";

import type { PrimaryTag } from "../../../../Utils/types/api.schemas.ts";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorInputRef = useRef<HTMLInputElement | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      onSave({ ...tag, name, color, subtags: tag?.subtags ?? [] });
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
        <Typography variant="body2" color="text.secondary">
          Categories are managed inside the module workspace.
        </Typography>
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
    </Dialog>
  );
}

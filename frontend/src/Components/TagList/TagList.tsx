import { useEffect, useState } from "react";
import api from "../../Utils/api";

import { FaPlus, FaBookOpen, FaTableColumns } from "react-icons/fa6";
import type { PrimaryTag } from "../../Utils/types/api.schemas";

import TagItem from "./Components/TagItem/TagItem";
import TagPopup from "./Components/TagPopup/TagPopup";

import "./TagList.css";
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  List,
  Snackbar,
  Tooltip,
  Typography,
} from "@mui/material";
import ConfirmDialogue from "../ConfirmDialogue/ConfirmDialogue";

export default function TagList({
  onSelect,
  onChanged,
  selectedTagId,
  onOpenOrganisationTool,
  organisationMode,
}: {
  onSelect: (tag: PrimaryTag) => void;
  onChanged: () => void;
  selectedTagId: number | null;
  onOpenOrganisationTool: () => void;
  organisationMode: boolean;
}) {
  const [tags, setTags] = useState<PrimaryTag[]>([]);
  const [editingTag, setEditingTag] = useState<PrimaryTag | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<PrimaryTag | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTags = async () => {
    setLoading(true);
    await api
      .get<PrimaryTag[]>("primary-tags/")
      .then((res) => {
        if (res) setTags(res.data);
      })
      .catch(() => {
        setError("Failed to load modules. Please try again.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTags();
  }, []);

  const openPopup = (tag?: PrimaryTag) => {
    setEditingTag(tag || null);
    setPopupOpen(true);
  };

  const closePopup = () => {
    setPopupOpen(false);
  };

  const saveTag = async (tag: Omit<PrimaryTag, "id"> & { id?: number }) => {
    if (tag.id) {
      await api
        .put<PrimaryTag>(`primary-tags/${tag.id}/`, tag)
        .then((res) => {
          if (res?.data != null) {
            const savedTag = res.data;
            setTags(tags.map((t) => (t.id === savedTag.id ? savedTag : t)));
          }
        })
        .catch(() => {
          setError("Failed to save module. Please try again.");
        });
    } else {
      const res = await api
        .post<PrimaryTag>("primary-tags/", tag)
        .catch(() => {
          setError("Failed to create module. Please try again.");
          return undefined;
        });

      if (res?.data != null) {
        const savedTag = res.data;

        // Create subtags now that the real parent id is available
        for (const subtag of tag.subtags) {
          await api
            .post("subtags/", { name: subtag.name, parent: savedTag.id })
            .catch(() => {
              setError("Module created, but some categories failed to save.");
            });
        }

        // Re-fetch the tag to include the newly created subtags
        const refreshed = await api.get<PrimaryTag>(`primary-tags/${savedTag.id}/`);
        if (refreshed?.data) {
          setTags([...tags, refreshed.data]);
        } else {
          setTags([...tags, savedTag]);
        }
      }
    }

    onChanged();
    closePopup();
  };

  const deleteTag = async (id?: number) => {
    if (!id) return;

    await api
      .del(`primary-tags/${id}/`)
      .then(() => {
        setTags(tags.filter((t) => t.id !== id));
      })
      .catch(() => {
        setError("Failed to delete module. Please try again.");
      });

    setTagToDelete(null);
    onChanged();
  };

  return (
    <div className="taglist-container" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <FaBookOpen size={15} style={{ color: "#6b6b6b" }} />
          <Typography variant="subtitle2" color="text.secondary">
            Modules
          </Typography>
        </Box>
        <Tooltip title="Add module">
          <IconButton onClick={() => openPopup()} sx={{ padding: "8px" }} aria-label="Add module">
            <FaPlus size={14} />
          </IconButton>
        </Tooltip>
      </Box>
      <Divider />

      <Box sx={{ flex: 1, overflow: "auto" }}>
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}>
          <CircularProgress size={20} />
        </div>
      ) : tags.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ padding: "32px 8px", textAlign: "center" }}
        >
          No modules yet. Click + to add one.
        </Typography>
      ) : (
        <List sx={{ pt: 1.5 }}>
          {tags.map((tag) => (
            <TagItem
              key={tag.id}
              tag={tag}
              selected={tag.id === selectedTagId}
              onEdit={() => openPopup(tag)}
              onDelete={() => setTagToDelete(tag)}
              onClick={() => onSelect(tag)}
            />
          ))}
        </List>
      )}
      </Box>

      <Divider sx={{ mt: 1.5, mb: 1.5 }} />
      <Tooltip title="Open organisation tool">
        <IconButton
          onClick={onOpenOrganisationTool}
          sx={{
            width: "100%",
            justifyContent: "flex-start",
            borderRadius: "6px",
            padding: "8px 10px",
            backgroundColor: organisationMode ? "rgba(255,255,255,0.08)" : "transparent",
          }}
          aria-label="Open organisation tool"
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <FaTableColumns size={14} style={{ color: organisationMode ? "#ededed" : "#6b6b6b" }} />
            <Typography variant="body2" color={organisationMode ? "text.primary" : "text.secondary"}>
              Organisation tool
            </Typography>
          </Box>
        </IconButton>
      </Tooltip>

      {popupOpen && <TagPopup tag={editingTag} onClose={closePopup} onSave={saveTag} />}

      <ConfirmDialogue
        open={tagToDelete !== null}
        onConfirm={() => deleteTag(tagToDelete?.id)}
        onDecline={() => setTagToDelete(null)}
        title={`Delete "${tagToDelete?.name}"`}
        message="This will permanently delete the module and all its data. This cannot be undone."
        confirmLabel="Delete"
        backdropStyle={{ backgroundColor: "rgba(0,0,0,0.08)" }}
      />

      <Snackbar
        open={error !== null}
        autoHideDuration={4000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </div>
  );
}

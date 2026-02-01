import { useEffect, useState } from "react";
import api from "../../Utils/api";

import { FaPlus } from "react-icons/fa6";
import type { PrimaryTag } from "../../Utils/types/api.schemas";

import TagItem from "./Components/TagItem/TagItem";
import TagPopup from "./Components/TagPopup/TagPopup";

import "./TagList.css";
import { Divider, IconButton, List } from "@mui/material";
import ConfirmDialogue from "../ConfirmDialogue/ConfirmDialogue";

export default function TagList({
  onSelect,
  onChanged,
}: {
  onSelect: (tag: PrimaryTag) => void;
  onChanged: () => void;
}) {
  const [tags, setTags] = useState<PrimaryTag[]>([]);
  const [editingTag, setEditingTag] = useState<PrimaryTag | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const loadTags = async () => {
    await api
      .get<PrimaryTag[]>("primary-tags/")
      .then((res) => {
        if (res) setTags(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
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

  const saveTag = async (tag: PrimaryTag) => {
    if (tag.id) {
      await api
        .put<PrimaryTag>(`primary-tags/${tag.id}/`, tag)
        .then((res) => {
          if (res?.data != null) {
            const savedTag = res.data;
            setTags(tags.map((t) => (t.id === savedTag.id ? savedTag : t)));
          }
        })
        .catch((err) => {
          console.log(err.message);
        });
    } else {
      await api
        .post<PrimaryTag>("primary-tags/", tag)
        .then((res) => {
          if (res?.data != null) {
            const savedTag = res.data;
            setTags([...tags, savedTag]);
          }
        })
        .catch((err) => {
          console.log(err.message);
        });
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
      .catch((err) => {
        console.log(err.message);
      });

    onChanged();
  };

  return (
    <div className="taglist-container">
      <IconButton onClick={() => openPopup()} sx={{ padding: "5px", marginLeft: "365px" }}>
        <FaPlus />
      </IconButton>
      <Divider sx={{ marginTop: "15px" }} />
      <List>
        {tags.map((tag) => (
          <div key={tag.id}>
            <TagItem
              tag={tag}
              onEdit={() => openPopup(tag)}
              onDelete={() => setOpen(true)}
              onClick={() => onSelect(tag)}
            />
            <ConfirmDialogue
              open={open}
              onConfirm={() => {
                deleteTag(tag.id);
              }}
              onDecline={() => {
                setOpen(false);
              }}
              title={`Delete: ${tag.name}`}
              message="Do you confirm deletion?"
            />
          </div>
        ))}
      </List>
      {popupOpen && <TagPopup tag={editingTag} onClose={closePopup} onSave={saveTag} />}{" "}
    </div>
  );
}

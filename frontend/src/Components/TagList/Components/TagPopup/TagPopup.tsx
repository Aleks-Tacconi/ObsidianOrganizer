import { useState, useRef } from "react";
import { FaPlus } from "react-icons/fa6";

import SubtagItem from "../SubtagItem/SubtagItem";
import ConfirmDialogue from "../../../ConfirmDialogue/ConfirmDialogue.tsx";

import api from "../../../../Utils/api";
import type { PrimaryTag, SubTag } from "../../../../Utils/types/api.schemas.ts";

import "./TagPopup.css";
import { Button, TextField } from "@mui/material";

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
  const [open, setOpen] = useState(false);

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
  };

  const updateSubtag = (index: number, name: string) => {
    const copy = [...subtags];
    copy[index].name = name;
    setSubtags(copy);
  };

  const handleSave = async () => {
    for (const subtag of subtags) {
      const st = { name: subtag.name, parent: tag?.id };

      if (subtag.id != -1) {
        await api.put<SubTag>(`subtags/${subtag.id}/`, st).catch((err) => {
          console.log(err.message);
        });
      } else {
        await api.post<SubTag>("subtags/", st).catch((err) => {
          console.log(err.message);
        });
      }
    }

    deleteQue.forEach(async (toDelete) => {
      await api.del(`subtags/${toDelete}/`).catch((err) => {
        console.log(err.message);
      });
    });

    onSave({ ...tag, name, color, subtags });
  };

  return (
    <div className="popup">
      <div className="popup-content">
        <div style={{ display: "flex", alignItems: "center" }}>
          <TextField
            label="Tag Name"
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ width: "100%" }}
          />
          <div
            onClick={() => colorInputRef.current?.click()}
            style={{
              width: 24,
              height: 24,
              borderRadius: "6px",
              backgroundColor: color,
              margin: "0 16px",
              cursor: "pointer",
              border: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
            }}
          ></div>
          <input
            ref={colorInputRef}
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{
              position: "absolute",
              opacity: 0,
              width: 0,
              height: 0,
              pointerEvents: "none",
            }}
          />{" "}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {subtags.map((subtag, i) => (
            <div key={i}>
              <ConfirmDialogue
                open={open}
                onConfirm={() => {
                  removeSubtag(i);
                  setOpen(false);
                }}
                onDecline={() => {
                  setOpen(false);
                }}
                title={`Delete ${subtag.name}`}
                message="Configm deletion?"
                backdropStyle={{ backgroundColor: "rgba(0,0,0,0.08)" }}
              />
              <SubtagItem
                subtag={subtag}
                onChange={(name) => updateSubtag(i, name)}
                onRemove={() => setOpen(true)}
              />
            </div>
          ))}

          <Button variant="outlined" startIcon={<FaPlus />} onClick={addSubtag}>
            Add Category
          </Button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <Button
            variant="contained"
            onClick={() => {
              onClose();
              setDeleteQue([]);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

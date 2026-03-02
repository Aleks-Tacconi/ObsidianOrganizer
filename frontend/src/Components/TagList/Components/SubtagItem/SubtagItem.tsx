import { FaTrashCan } from "react-icons/fa6";
import type { SubTag } from "../../../../Utils/types/api.schemas.ts";
import { IconButton, TextField, Tooltip } from "@mui/material";

export default function SubtagItem({
  subtag,
  onChange,
  onRemove,
}: {
  subtag: SubTag;
  onChange: (name: string) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <TextField
        label="Category Name"
        variant="outlined"
        value={subtag.name}
        onChange={(e) => onChange(e.target.value)}
        sx={{ width: "100%" }}
      />
      <Tooltip title="Remove category">
        <IconButton onClick={onRemove} aria-label="Remove category" sx={{ padding: "8px" }}>
          <FaTrashCan size={14} />
        </IconButton>
      </Tooltip>
    </div>
  );
}

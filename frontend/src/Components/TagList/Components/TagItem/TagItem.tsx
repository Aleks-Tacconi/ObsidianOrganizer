import { IconButton, ListItem, ListItemButton, ListItemText, Tooltip } from "@mui/material";
import { FaTrashCan, FaPenToSquare } from "react-icons/fa6";

import type { PrimaryTag } from "../../../../Utils/types/api.schemas";

export default function TagItem({
  tag,
  onEdit,
  onDelete,
  onClick,
}: {
  tag: PrimaryTag;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  return (
    <ListItem
      sx={{
        pr: 0,
        "& .tag-actions": { opacity: 0, transition: "opacity 150ms ease-out" },
        "&:hover .tag-actions": { opacity: 1 },
      }}
    >
      <ListItemButton onClick={onClick} sx={{ borderRadius: "6px" }}>
        <ListItemText primary={tag.name} />
      </ListItemButton>
      <div className="tag-actions" style={{ display: "flex" }}>
        <Tooltip title="Edit">
          <IconButton onClick={onEdit} size="small" aria-label={`Edit ${tag.name}`}>
            <FaPenToSquare size={14} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton onClick={onDelete} size="small" aria-label={`Delete ${tag.name}`}>
            <FaTrashCan size={14} />
          </IconButton>
        </Tooltip>
      </div>
    </ListItem>
  );
}

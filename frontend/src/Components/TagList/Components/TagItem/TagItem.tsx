import { IconButton, ListItem, ListItemButton, ListItemText, Tooltip } from "@mui/material";
import { FaTrashCan, FaPenToSquare } from "react-icons/fa6";

import type { PrimaryTag } from "../../../../Utils/types/api.schemas";

export default function TagItem({
  tag,
  selected,
  onEdit,
  onDelete,
  onClick,
}: {
  tag: PrimaryTag;
  selected: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  return (
    <ListItem
      disablePadding
      sx={{
        mb: 0.5,
        "& .tag-actions": { opacity: 0, transition: "opacity 150ms ease-out" },
        "&:hover .tag-actions": { opacity: 1 },
      }}
    >
      <ListItemButton
        onClick={onClick}
        selected={selected}
        sx={{
          borderRadius: "6px",
          py: 1,
          pr: 1,
          ...(selected && {
            borderLeft: "2px solid #e0e0e0",
            pl: "14px",
            backgroundColor: "rgba(255,255,255,0.06)",
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.08)",
            },
          }),
        }}
      >
        <ListItemText
          primary={tag.name}
          primaryTypographyProps={{
            fontWeight: selected ? 500 : 400,
            fontSize: "0.925rem",
          }}
        />
        <div className="tag-actions" style={{ display: "flex", gap: "2px" }}>
          <Tooltip title="Edit">
            <IconButton
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              size="small"
              aria-label={`Edit ${tag.name}`}
            >
              <FaPenToSquare size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              size="small"
              aria-label={`Delete ${tag.name}`}
            >
              <FaTrashCan size={14} />
            </IconButton>
          </Tooltip>
        </div>
      </ListItemButton>
    </ListItem>
  );
}

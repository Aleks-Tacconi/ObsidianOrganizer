import { Box, IconButton, ListItem, ListItemButton, ListItemText, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { FaCircleCheck, FaPenToSquare, FaTrashCan } from "react-icons/fa6";

import type { PrimaryTag } from "../../../../Utils/types/api.schemas";

export type SidebarTag = PrimaryTag & {
  completed_note_count?: number;
  note_count?: number;
  is_complete?: boolean;
};

export default function TagItem({
  tag,
  selected,
  onEdit,
  onDelete,
  onClick,
}: {
  tag: SidebarTag;
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
          position: "relative",
          overflow: "hidden",
          borderRadius: "6px",
          py: 1,
          pr: 1,
          pl: 2,
          ...(selected && {
            backgroundColor: "rgba(255,255,255,0.06)",
            "&::before": {
              content: '""',
              position: "absolute",
              left: 8,
              top: 8,
              bottom: 8,
              width: "2px",
              borderRadius: "999px",
              backgroundColor: tag.color,
            },
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

          {tag.is_complete && (
            <Tooltip title="All lectures complete">
              <Box
                aria-label={`${tag.name} complete`}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ml: 0.5,
                  color: alpha(tag.color, 0.92),
                  flexShrink: 0,
                }}
              >
                <FaCircleCheck size={13} />
              </Box>
            </Tooltip>
          )}
      </ListItemButton>
    </ListItem>
  );
}

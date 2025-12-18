import { IconButton, ListItem, ListItemButton, ListItemText } from "@mui/material";
import { FaTrashCan, FaPenToSquare } from "react-icons/fa6";

import type { PrimaryTag } from "../../../../Utils/types/api.schemas";

export default function TagItem({ tag, onEdit, onDelete, onClick }: { tag: PrimaryTag; onEdit: () => void; onDelete: () => void; onClick: () => void }) {
    // <div className="taglist-item" style={{ backgroundColor: tag.color }} onClick={onClick}>

    return (
        <ListItem>
            <ListItemButton onClick={onClick}>
                <ListItemText>{tag.name}</ListItemText>
            </ListItemButton>
            <>
                <IconButton>
                    <FaPenToSquare onClick={onEdit} />
                </IconButton>
                <IconButton>
                    <FaTrashCan onClick={onDelete} />
                </IconButton>
            </>
        </ListItem>
    );
}

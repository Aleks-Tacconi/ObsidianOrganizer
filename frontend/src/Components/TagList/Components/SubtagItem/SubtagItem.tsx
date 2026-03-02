import { FaTrashCan } from "react-icons/fa6";
import type { SubTag } from "../../../../Utils/types/api.schemas.ts";
import { IconButton, TextField } from "@mui/material";

export default function SubtagItem({ subtag, onChange, onRemove }: { subtag: SubTag; onChange: (name: string) => void; onRemove: () => void }) {
    return (
        <div style={{ display: "flex", alignItems: "center" }}>
            <TextField label="Category Name" variant="outlined" value={subtag.name} onChange={(e) => onChange(e.target.value)} sx={{ width: "100%" }} />
            <IconButton onClick={onRemove} sx={{ padding: "12px" }}>
                <FaTrashCan />
            </IconButton>
        </div>
    );
}

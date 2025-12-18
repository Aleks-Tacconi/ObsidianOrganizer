import { useEffect, useState } from "react";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import { FaBars } from "react-icons/fa6";

import TagList from "../../Components/TagList/TagList";
import ModulePannel from "../../Components/ModulePannel/ModulePannel";

import type { PrimaryTag } from "../../Utils/types/api.schemas";

export default function Dashboard() {
    const [selectedTag, setSelectedTag] = useState<PrimaryTag | null>(null);
    const [open, setOpen] = useState(true);
    const [refresh, setRefresh] = useState(0);

    const triggerRefresh = () => setRefresh((r) => r + 1);

    useEffect(() => {
        setOpen(false);
    }, [selectedTag]);

    return (
        <div style={{ display: "flex" }}>
            <IconButton
                onClick={() => setOpen(!open)}
                sx={{ position: "fixed", top: 12, left: 12, zIndex: 2000 }}
            >
                <FaBars />
            </IconButton>

            <Drawer variant="persistent" anchor="left" open={open}>
                <TagList onSelect={setSelectedTag} onChanged={triggerRefresh} />
            </Drawer>

            <main>{selectedTag && <ModulePannel moduleId={selectedTag} refresh={refresh} />}</main>
        </div>
    );
}

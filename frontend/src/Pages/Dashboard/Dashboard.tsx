import { useEffect, useState } from "react";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { FaBars } from "react-icons/fa6";

import TagList from "../../Components/TagList/TagList";
import ModulePanel from "../../Components/ModulePannel/ModulePannel";

import type { PrimaryTag } from "../../Utils/types/api.schemas";

const DRAWER_WIDTH = 320;

export default function Dashboard() {
  const [selectedTag, setSelectedTag] = useState<PrimaryTag | null>(null);
  const [open, setOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const triggerRefresh = () => setRefresh((r) => r + 1);

  const handleSelectTag = (tag: PrimaryTag) => {
    setSelectedTag(tag);
    localStorage.setItem("selectedTag", JSON.stringify(tag));
    setOpen(false);
  };

  useEffect(() => {
    const saved = localStorage.getItem("selectedTag");
    if (!saved) return;

    try {
      const parsed: PrimaryTag = JSON.parse(saved);
      // Tag will be validated by ModulePanel on load — if it fails the panel shows an error
      setSelectedTag(parsed);
    } catch {
      localStorage.removeItem("selectedTag");
    }
  }, []);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Tooltip title={open ? "Close sidebar" : "Open sidebar"}>
        <IconButton
          onClick={() => setOpen(!open)}
          sx={{ position: "fixed", top: 12, left: 12, zIndex: 2000 }}
          aria-label={open ? "Close sidebar" : "Open sidebar"}
        >
          <FaBars />
        </IconButton>
      </Tooltip>

      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        sx={{
          width: open ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
        }}
      >
        <TagList onSelect={handleSelectTag} onChanged={triggerRefresh} />
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          marginLeft: open ? `${DRAWER_WIDTH}px` : 0,
          transition: "margin-left 225ms cubic-bezier(0.4, 0, 0.6, 1)",
          padding: "24px",
          maxWidth: open ? `calc(1100px + ${DRAWER_WIDTH}px)` : "1100px",
          minHeight: "100vh",
        }}
      >
        {selectedTag ? (
          <ModulePanel moduleId={selectedTag} refresh={refresh} />
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "60vh",
              gap: 1,
            }}
          >
            <Typography variant="body1" color="text.secondary">
              Open the sidebar and select a module to get started.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

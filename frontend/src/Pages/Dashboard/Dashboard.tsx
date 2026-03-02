import { useEffect, useState } from "react";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { FaBars, FaTableColumns } from "react-icons/fa6";

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
        variant="temporary"
        anchor="left"
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
        }}
      >
        <TagList
          onSelect={handleSelectTag}
          onChanged={triggerRefresh}
          selectedTagId={selectedTag?.id ?? null}
        />
      </Drawer>

      <Box
        component="main"
        sx={{
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: "1100px", padding: "32px 32px 64px" }}>
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
              gap: 2,
            }}
          >
            <FaTableColumns size={40} style={{ color: "#6b6b6b" }} />
            <Typography variant="body1" color="text.secondary">
              Open the sidebar and select a module to get started.
            </Typography>
          </Box>
        )}
        </Box>
      </Box>
    </Box>
  );
}

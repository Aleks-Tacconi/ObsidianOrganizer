import { useState, type ReactNode } from "react";
import { Drawer, IconButton, Tooltip, Box } from "@mui/material";
import { FaBars } from "react-icons/fa6";

import TagList from "../TagList/TagList";
import type { PrimaryTag } from "../../Utils/types/api.schemas";

const DRAWER_WIDTH = 320;

type SidebarLayoutProps = {
  selectedTagId: number | null;
  onSelectTag: (tag: PrimaryTag) => void;
  onTagsChanged: () => void;
  children: ReactNode;
};

export default function SidebarLayout({
  selectedTagId,
  onSelectTag,
  onTagsChanged,
  children,
}: SidebarLayoutProps) {
  const [open, setOpen] = useState(false);

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
          onSelect={(tag) => {
            onSelectTag(tag);
            setOpen(false);
          }}
          onChanged={onTagsChanged}
          selectedTagId={selectedTagId}
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
        <Box sx={{ width: "100%", maxWidth: "1100px", padding: "32px 32px 64px" }}>{children}</Box>
      </Box>
    </Box>
  );
}

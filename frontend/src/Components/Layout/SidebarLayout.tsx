import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Box, Button, Drawer, IconButton, Tooltip } from "@mui/material";
import { FaBars, FaBookOpen } from "react-icons/fa6";

import TagList from "../TagList/TagList";
import type { PrimaryTag } from "../../Utils/types/api.schemas";

const DRAWER_WIDTH = 320;

type SidebarLayoutProps = {
  selectedTagId: number | null;
  onSelectTag: (tag: PrimaryTag) => void;
  onTagsChanged: () => void;
  refreshKey: number;
  children: ReactNode;
  contentMaxWidth?: string;
  menuPlacement?: "floating" | "inline";
};

export default function SidebarLayout({
  selectedTagId,
  onSelectTag,
  onTagsChanged,
  refreshKey,
  children,
  contentMaxWidth = "1100px",
  menuPlacement = "floating",
}: SidebarLayoutProps) {
  const [open, setOpen] = useState(false);

  const menuTrigger = menuPlacement === "inline" ? (
    <Button
      onClick={() => setOpen(true)}
      startIcon={<FaBookOpen size={14} />}
      variant="outlined"
      sx={{
        alignSelf: "flex-start",
        borderColor: "rgba(255,255,255,0.07)",
        color: "text.primary",
        borderRadius: "6px",
        textTransform: "none",
        px: 1.5,
        py: 0.75,
        minWidth: 0,
        "&:hover": {
          borderColor: "rgba(255,255,255,0.12)",
          backgroundColor: "rgba(255,255,255,0.04)",
        },
      }}
    >
      Modules
    </Button>
  ) : (
    <Tooltip title={open ? "Close sidebar" : "Open sidebar"}>
      <Box sx={{ position: "fixed", top: 12, left: 12, zIndex: 2000 }}>
        <IconButton
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close sidebar" : "Open sidebar"}
        >
          <FaBars />
        </IconButton>
      </Box>
    </Tooltip>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {menuPlacement === "floating" && menuTrigger}

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
          refreshKey={refreshKey}
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
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          sx={{ width: "100%", maxWidth: contentMaxWidth, padding: "32px 32px 64px" }}
        >
          {menuPlacement === "inline" && <Box sx={{ mb: 3 }}>{menuTrigger}</Box>}
          {children}
        </Box>
      </Box>
    </Box>
  );
}

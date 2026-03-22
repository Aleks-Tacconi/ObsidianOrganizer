import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Box, Drawer, IconButton, Tooltip, Typography } from "@mui/material";
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
    <Box
      component="button"
      onClick={() => setOpen(true)}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        alignSelf: "flex-start",
        border: 0,
        borderRadius: "6px",
        backgroundColor: "transparent",
        color: "text.secondary",
        cursor: "pointer",
        px: 0,
        py: 0,
        "&:hover": {
          color: "text.primary",
        },
        "&:focus-visible": {
          outline: "2px solid #e0e0e0",
          outlineOffset: 6,
        },
      }}
    >
      <FaBookOpen size={14} />
      <Typography variant="body2" sx={{ color: "inherit", fontWeight: 500 }}>
        Modules
      </Typography>
    </Box>
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

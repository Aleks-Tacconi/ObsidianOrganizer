import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Box, Drawer, Stack, Tooltip, Typography } from "@mui/material";
import { FaBars, FaRegFileLines, FaTableColumns } from "react-icons/fa6";
import { useLocation, useNavigate } from "react-router-dom";

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
};

export default function SidebarLayout({
  selectedTagId,
  onSelectTag,
  onTagsChanged,
  refreshKey,
  children,
  contentMaxWidth = "1100px",
}: SidebarLayoutProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const modulesTrigger = (
    <Box
      component="button"
      onClick={() => setOpen((current) => !current)}
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
      <FaBars size={14} />
      <Typography variant="body2" sx={{ color: "inherit", fontWeight: 500 }}>
        Modules
      </Typography>
    </Box>
  );

  const inAskVault = location.pathname === "/rag";
  const inOrganisationTool = location.pathname === "/organization-tool";

  const topBarLink = ({
    label,
    icon,
    active,
    onClick,
  }: {
    label: string;
    icon: ReactNode;
    active: boolean;
    onClick: () => void;
  }) => (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        border: 0,
        borderRadius: "6px",
        backgroundColor: active ? "rgba(255,255,255,0.06)" : "transparent",
        color: active ? "text.primary" : "text.secondary",
        cursor: "pointer",
        px: 1,
        py: 0.75,
        transition: "background-color 150ms ease-out, color 150ms ease-out",
        "&:hover": {
          backgroundColor: "rgba(255,255,255,0.04)",
          color: "text.primary",
        },
        "&:focus-visible": {
          outline: "2px solid #e0e0e0",
          outlineOffset: 2,
        },
      }}
    >
      {icon}
      <Typography variant="body2" sx={{ color: "inherit", fontWeight: active ? 600 : 500 }}>
        {label}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1200,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          backgroundColor: "#0a0a0a",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: contentMaxWidth,
            mx: "auto",
            px: { xs: 2, sm: 4 },
            py: 1.5,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Tooltip title={open ? "Close modules" : "Open modules"}>
              <Box>
                {modulesTrigger}
              </Box>
            </Tooltip>

            <Stack direction="row" spacing={1.25} alignItems="center">
              {topBarLink({
                label: "Ask Vault",
                icon: <FaRegFileLines size={14} />,
                active: inAskVault,
                onClick: () => navigate("/rag"),
              })}
              {topBarLink({
                label: "Organisation Tool",
                icon: <FaTableColumns size={14} />,
                active: inOrganisationTool,
                onClick: () => navigate("/organization-tool"),
              })}
            </Stack>
          </Stack>
        </Box>
      </Box>

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
          sx={{ width: "100%", maxWidth: contentMaxWidth, padding: "24px 32px 64px" }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

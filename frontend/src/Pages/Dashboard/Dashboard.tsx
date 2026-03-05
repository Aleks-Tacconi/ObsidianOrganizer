import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { FaBars, FaTableColumns } from "react-icons/fa6";

import TagList from "../../Components/TagList/TagList";
import ModulePanel from "../../Components/ModulePannel/ModulePannel";
import api from "../../Utils/api";

import type { PrimaryTag } from "../../Utils/types/api.schemas";

const DRAWER_WIDTH = 320;

export default function Dashboard() {
  const { moduleId: moduleIdParam } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();

  const [selectedTag, setSelectedTag] = useState<PrimaryTag | null>(null);
  const [open, setOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);

  const triggerRefresh = () => setRefresh((r) => r + 1);

  // Fetch the PrimaryTag when the route param changes
  useEffect(() => {
    if (!moduleIdParam) {
      setSelectedTag(null);
      return;
    }

    const id = Number(moduleIdParam);
    if (Number.isNaN(id)) {
      navigate("/", { replace: true });
      return;
    }

    // Skip re-fetch if already loaded
    if (selectedTag?.id === id) return;

    setLoading(true);
    api
      .get<PrimaryTag>(`primary-tags/${id}/`)
      .then((res) => {
        if (res?.data) {
          setSelectedTag(res.data);
        } else {
          navigate("/", { replace: true });
        }
      })
      .catch(() => {
        navigate("/", { replace: true });
      })
      .finally(() => setLoading(false));
    // selectedTag intentionally excluded — only react to route param changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleIdParam, navigate]);

  const handleSelectTag = (tag: PrimaryTag) => {
    setSelectedTag(tag);
    navigate(`/modules/${tag.id}`);
    setOpen(false);
  };

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
        {selectedTag && !loading ? (
          <ModulePanel moduleId={selectedTag} refresh={refresh} />
        ) : (
          !loading && (
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
          )
        )}
        </Box>
      </Box>
    </Box>
  );
}

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { FaTableColumns } from "react-icons/fa6";

import SidebarLayout from "../../Components/Layout/SidebarLayout";
import ModulePanel from "../../Components/ModulePannel/ModulePannel";
import api from "../../Utils/api";
import { staggerContainer, staggerItem } from "../../Utils/motion";

import type { PrimaryTag } from "../../Utils/types/api.schemas";

export default function Dashboard() {
  const { moduleId: moduleIdParam } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();

  const [selectedTag, setSelectedTag] = useState<PrimaryTag | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);

  const triggerRefresh = () => setRefresh((r) => r + 1);

  // Fetch the PrimaryTag when the route param changes
  useEffect(() => {
    if (!moduleIdParam) {
      setSelectedTag(null);
      setLoading(false);
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
    localStorage.setItem("selectedTag", JSON.stringify(tag));
    navigate(`/modules/${tag.id}`);
  };

  useEffect(() => {
    if (moduleIdParam) return;
    const saved = localStorage.getItem("selectedTag");
    if (!saved) return;

    try {
      const parsed: PrimaryTag = JSON.parse(saved);
      // Tag will be validated by ModulePanel on load — if it fails the panel shows an error
      setSelectedTag(parsed);
    } catch {
      localStorage.removeItem("selectedTag");
    }
  }, [moduleIdParam]);

  return (
    <SidebarLayout
      onSelectTag={handleSelectTag}
      onTagsChanged={triggerRefresh}
      selectedTagId={selectedTag?.id ?? null}
      refreshKey={refresh}
      contentMaxWidth={selectedTag ? "none" : "1100px"}
      menuPlacement={selectedTag ? "inline" : "floating"}
    >
      {selectedTag && !loading ? (
        <ModulePanel moduleId={selectedTag} refresh={refresh} onNotesChanged={triggerRefresh} />
      ) : (
        !loading && (
          <Box
            component={motion.div}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "60vh",
              gap: 2,
            }}
          >
            <Box component={motion.div} variants={staggerItem}>
              <FaTableColumns size={40} style={{ color: "#6b6b6b" }} />
            </Box>
            <Typography component={motion.p} variants={staggerItem} variant="body1" color="text.secondary">
              Open the sidebar and select a module to get started.
            </Typography>
          </Box>
        )
      )}
    </SidebarLayout>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { FaBookOpen, FaFolder, FaFolderOpen } from "react-icons/fa6";

import api from "../../Utils/api";
import type {
  ApplyTagsBulkRequest,
  ScanVaultTagsResponse,
} from "../../Utils/api";
import type { PrimaryTag, SubTag } from "../../Utils/types/api.schemas";

const toFileName = (path: string) => path.split("/").pop()?.replace(/\.md$/, "") ?? path;

export default function OrganisationPanel() {
  const [modules, setModules] = useState<PrimaryTag[]>([]);
  const [selectedModule, setSelectedModule] = useState<PrimaryTag | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SubTag | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [untaggedFiles, setUntaggedFiles] = useState<{ name: string; path: string }[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingUntagged, setLoadingUntagged] = useState(true);
  const [loadingVaultModules, setLoadingVaultModules] = useState(true);
  const [selectedUntaggedPaths, setSelectedUntaggedPaths] = useState<string[]>([]);
  const [vaultModules, setVaultModules] = useState<ScanVaultTagsResponse["modules"]>([]);
  const [applying, setApplying] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingModules(true);
    api
      .get<PrimaryTag[]>("primary-tags/")
      .then((res) => {
        if (res?.data) {
          setModules(res.data);
        }
      })
      .catch(() => {
        setError("Failed to load modules.");
      })
      .finally(() => setLoadingModules(false));
  }, []);

  useEffect(() => {
    setLoadingUntagged(true);
    api.organisation
      .getUntaggedFiles()
      .then((res) => {
        if (res?.data) {
          setUntaggedFiles(res.data.files);
        }
      })
      .catch(() => {
        setError("Failed to load vault organisation status.");
      })
      .finally(() => setLoadingUntagged(false));
  }, []);

  useEffect(() => {
    setLoadingVaultModules(true);
    api.organisation
      .scanVaultTags()
      .then((res) => {
        if (res?.data) {
          setVaultModules(res.data.modules);
        }
      })
      .catch(() => {
        setError("Failed to scan vault tags.");
      })
      .finally(() => setLoadingVaultModules(false));
  }, []);

  useEffect(() => {
    if (!selectedModule || !selectedCategory) {
      setFiles([]);
      return;
    }

    setLoadingFiles(true);
    api.organisation
      .matchTags({
        tags: [selectedModule.name, selectedCategory.name],
      })
      .then((res) => {
        if (res?.data) {
          setFiles(res.data.files);
        }
      })
      .catch(() => {
        setError("Failed to load notes for the selected category.");
      })
      .finally(() => setLoadingFiles(false));
  }, [selectedModule, selectedCategory]);

  const categories = useMemo(() => selectedModule?.subtags ?? [], [selectedModule]);

  const applyTagsToSelectedFiles = async () => {
    if (selectedUntaggedPaths.length === 0 || !selectedModule || !selectedCategory) {
      return;
    }

    setApplying(true);
    setError(null);
    setSuccess(null);

    const payload: ApplyTagsBulkRequest = {
      paths: selectedUntaggedPaths,
      module: selectedModule.name,
      topic: selectedCategory.name,
    };

    await api
      .organisation.applyTagsBulk(payload)
      .then((res) => {
        if (!res?.data) {
          setError("Failed to apply tags.");
          return;
        }

        const appliedPaths = new Set(
          res.data.results.filter((result) => result.updated).map((result) => result.path),
        );
        setUntaggedFiles((prev) => prev.filter((file) => !appliedPaths.has(file.path)));
        setSelectedUntaggedPaths((prev) => prev.filter((path) => !appliedPaths.has(path)));

        if (res.data.applied_count > 0) {
          setSuccess(
            `Applied ${res.data.tag} to ${res.data.applied_count} ${res.data.applied_count === 1 ? "file" : "files"}.`,
          );
        } else {
          setSuccess("No files were updated.");
        }

        if (res.data.failed_count > 0) {
          setError(`${res.data.failed_count} file(s) failed to update.`);
        }
      })
      .catch(() => {
        setError("Failed to apply tags.");
      })
      .finally(() => setApplying(false));
  };

  const toggleUntaggedSelection = (path: string) => {
    setSelectedUntaggedPaths((prev) =>
      prev.includes(path) ? prev.filter((selectedPath) => selectedPath !== path) : [...prev, path],
    );
  };

  return (
    <Stack spacing={3} sx={{ mt: 6, px: { xs: 0, sm: 2 }, width: "100%" }}>
      <Box>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <FaFolderOpen size={18} style={{ color: "#6b6b6b" }} />
          <Typography variant="h5">Organisation Tool</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Pick a module and category to browse matching vault notes.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Paper elevation={0} sx={{ borderRadius: "6px", p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <FaFolder size={14} style={{ color: "#6b6b6b" }} />
              <Typography variant="subtitle2" color="text.secondary">
                Modules
              </Typography>
            </Stack>
            {loadingModules ? (
              <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <List dense disablePadding>
                {modules.map((module) => (
                  <ListItemButton
                    key={module.id}
                    selected={selectedModule?.id === module.id}
                    onClick={() => {
                      setSelectedModule(module);
                      setSelectedCategory(null);
                    }}
                    sx={{ borderRadius: "6px" }}
                  >
                    <ListItemText primary={module.name} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>

          <Divider flexItem orientation="vertical" sx={{ display: { xs: "none", md: "block" } }} />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <FaFolder size={14} style={{ color: "#6b6b6b" }} />
              <Typography variant="subtitle2" color="text.secondary">
                Categories
              </Typography>
            </Stack>
            <List dense disablePadding>
              {categories.map((category) => (
                <ListItemButton
                  key={category.id}
                  selected={selectedCategory?.id === category.id}
                  onClick={() => setSelectedCategory(category)}
                  sx={{ borderRadius: "6px" }}
                >
                  <ListItemText primary={category.name} />
                </ListItemButton>
              ))}
              {selectedModule && categories.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  No categories in this module.
                </Typography>
              )}
            </List>
          </Box>

          <Divider flexItem orientation="vertical" sx={{ display: { xs: "none", md: "block" } }} />

          <Box sx={{ flex: 1.2, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <FaBookOpen size={14} style={{ color: "#6b6b6b" }} />
              <Typography variant="subtitle2" color="text.secondary">
                Notes
              </Typography>
            </Stack>
            {loadingFiles ? (
              <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <List dense disablePadding>
                {files.map((filePath) => (
                  <ListItemButton key={filePath} sx={{ borderRadius: "6px" }}>
                    <ListItemText primary={toFileName(filePath)} secondary={filePath} />
                  </ListItemButton>
                ))}
                {selectedModule && selectedCategory && files.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                    No notes found for this module/category pair.
                  </Typography>
                )}
              </List>
            )}
          </Box>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: "6px", p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Vault Module/Topic Discovery
        </Typography>
        {loadingVaultModules ? (
          <Box sx={{ py: 1, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={20} />
          </Box>
        ) : (
          <List dense disablePadding>
            {vaultModules.slice(0, 6).map((module) => (
              <ListItemText
                key={module.module}
                primary={module.module}
                secondary={module.topics.join(", ") || "No topics"}
                sx={{ py: 0.5 }}
              />
            ))}
            {vaultModules.length > 6 && (
              <Typography variant="caption" color="text.secondary">
                +{vaultModules.length - 6} more modules in vault
              </Typography>
            )}
          </List>
        )}
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: "6px", p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Vault Restructure Status
        </Typography>
        {loadingUntagged ? (
          <Box sx={{ py: 1, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={20} />
          </Box>
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {untaggedFiles.length} untagged files need a Module/Topic tag.
            </Typography>
            <List dense disablePadding>
              {untaggedFiles.slice(0, 8).map((file) => (
                <ListItemButton
                  key={file.path}
                  selected={selectedUntaggedPaths.includes(file.path)}
                  onClick={() => toggleUntaggedSelection(file.path)}
                  sx={{ px: 1, borderRadius: "6px" }}
                >
                  <ListItemText primary={file.name} secondary={file.path} />
                </ListItemButton>
              ))}
              {untaggedFiles.length > 8 && (
                <Typography variant="caption" color="text.secondary">
                  +{untaggedFiles.length - 8} more files
                </Typography>
              )}
            </List>
            <Button
              variant="contained"
              sx={{ mt: 1.5 }}
              onClick={applyTagsToSelectedFiles}
              disabled={
                applying || selectedUntaggedPaths.length === 0 || !selectedModule || !selectedCategory
              }
            >
              {applying ? "Applying..." : `Apply to selected files (${selectedUntaggedPaths.length})`}
            </Button>
          </>
        )}
      </Paper>
    </Stack>
  );
}

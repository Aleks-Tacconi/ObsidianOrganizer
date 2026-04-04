import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Fuse from "fuse.js";
import { FaTableColumns } from "react-icons/fa6";

import PageHeaderCard from "../Layout/PageHeaderCard";
import api from "../../Utils/api";
import type {
  ApplyTagsBulkRequest,
  CategoryMembershipFile,
  RemoveTagsBulkRequest,
} from "../../Utils/api";
import type { PrimaryTag, SubTag } from "../../Utils/types/api.schemas";

const SEARCH_DEBOUNCE_MS = 120;
const MAX_RENDERED_RESULTS = 200;

const buildFileFuse = (files: CategoryMembershipFile[]): Fuse<CategoryMembershipFile> => {
  return new Fuse(files, {
    keys: [
      { name: "name", weight: 0.75 },
      { name: "path", weight: 0.25 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
  });
};

const filterFiles = (
  files: CategoryMembershipFile[],
  fuse: Fuse<CategoryMembershipFile>,
  query: string,
): CategoryMembershipFile[] => {
  const cleanedQuery = query.trim();
  if (!cleanedQuery) {
    return files.slice(0, MAX_RENDERED_RESULTS);
  }

  return fuse.search(cleanedQuery, { limit: MAX_RENDERED_RESULTS }).map((result) => result.item);
};

const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
};

export default function OrganisationPanel() {
  const [modules, setModules] = useState<PrimaryTag[]>([]);
  const [selectedModule, setSelectedModule] = useState<PrimaryTag | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SubTag | null>(null);

  const [inCategoryFiles, setInCategoryFiles] = useState<CategoryMembershipFile[]>([]);
  const [notInCategoryFiles, setNotInCategoryFiles] = useState<CategoryMembershipFile[]>([]);

  const [selectedInPaths, setSelectedInPaths] = useState<string[]>([]);
  const [selectedNotInPaths, setSelectedNotInPaths] = useState<string[]>([]);

  const [inSearch, setInSearch] = useState("");
  const [notInSearch, setNotInSearch] = useState("");
  const debouncedInSearch = useDebouncedValue(inSearch, SEARCH_DEBOUNCE_MS);
  const debouncedNotInSearch = useDebouncedValue(notInSearch, SEARCH_DEBOUNCE_MS);
  const deferredInSearch = useDeferredValue(debouncedInSearch);
  const deferredNotInSearch = useDeferredValue(debouncedNotInSearch);

  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [applying, setApplying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const loadMembership = useCallback(async () => {
    if (!selectedModule || !selectedCategory) {
      setInCategoryFiles([]);
      setNotInCategoryFiles([]);
      setSelectedInPaths([]);
      setSelectedNotInPaths([]);
      return;
    }

    setLoadingMembership(true);

    await api.organisation
      .getCategoryMembership({
        module: selectedModule.name,
        topic: selectedCategory.name,
      })
      .then((res) => {
        if (!res?.data) {
          setError("Failed to load category membership.");
          return;
        }

        setInCategoryFiles(res.data.in_category);
        setNotInCategoryFiles(res.data.not_in_category);
        setSelectedInPaths([]);
        setSelectedNotInPaths([]);
      })
      .catch(() => {
        setError("Failed to load category membership.");
      })
      .finally(() => {
        setLoadingMembership(false);
      });
  }, [selectedCategory, selectedModule]);

  useEffect(() => {
    void loadMembership();
  }, [loadMembership]);

  const categories = useMemo(() => selectedModule?.subtags ?? [], [selectedModule]);
  const inCategoryFuse = useMemo(() => buildFileFuse(inCategoryFiles), [inCategoryFiles]);
  const notInCategoryFuse = useMemo(() => buildFileFuse(notInCategoryFiles), [notInCategoryFiles]);
  const filteredInCategory = useMemo(
    () => filterFiles(inCategoryFiles, inCategoryFuse, deferredInSearch),
    [deferredInSearch, inCategoryFiles, inCategoryFuse],
  );
  const filteredNotInCategory = useMemo(
    () => filterFiles(notInCategoryFiles, notInCategoryFuse, deferredNotInSearch),
    [deferredNotInSearch, notInCategoryFiles, notInCategoryFuse],
  );

  const togglePath = (
    path: string,
    setSelectedPaths: (updater: (prev: string[]) => string[]) => void,
  ) => {
    setSelectedPaths((prev) =>
      prev.includes(path)
        ? prev.filter((selectedPath) => selectedPath !== path)
        : [...prev, path],
    );
  };

  const toggleSelectAll = (
    paths: string[],
    selectedPaths: string[],
    setSelectedPaths: (paths: string[]) => void,
  ) => {
    const allSelected = paths.length > 0 && paths.every((path) => selectedPaths.includes(path));
    if (allSelected) {
      setSelectedPaths(selectedPaths.filter((path) => !paths.includes(path)));
      return;
    }

    const merged = new Set([...selectedPaths, ...paths]);
    setSelectedPaths(Array.from(merged));
  };

  const addSelected = async () => {
    if (!selectedModule || !selectedCategory || selectedNotInPaths.length === 0) {
      return;
    }

    setApplying(true);
    setError(null);
    setSuccess(null);

    const payload: ApplyTagsBulkRequest = {
      paths: selectedNotInPaths,
      module: selectedModule.name,
      topic: selectedCategory.name,
    };

    await api.organisation
      .applyTagsBulk(payload)
      .then((res) => {
        if (!res?.data) {
          setError("Failed to add selected notes.");
          return;
        }

        setSuccess(
          `Added ${res.data.tag} to ${res.data.applied_count} ${res.data.applied_count === 1 ? "note" : "notes"}.`,
        );
        if (res.data.failed_count > 0) {
          setError(`${res.data.failed_count} note(s) failed to update.`);
        }
      })
      .catch(() => {
        setError("Failed to add selected notes.");
      })
      .finally(() => {
        setApplying(false);
      });

    await loadMembership();
  };

  const removeSelected = async () => {
    if (!selectedModule || !selectedCategory || selectedInPaths.length === 0) {
      return;
    }

    setRemoving(true);
    setError(null);
    setSuccess(null);

    const payload: RemoveTagsBulkRequest = {
      paths: selectedInPaths,
      module: selectedModule.name,
      topic: selectedCategory.name,
    };

    await api.organisation
      .removeTagsBulk(payload)
      .then((res) => {
        if (!res?.data) {
          setError("Failed to remove selected notes.");
          return;
        }

        setSuccess(
          `Removed ${res.data.tag} from ${res.data.removed_count} ${res.data.removed_count === 1 ? "note" : "notes"}.`,
        );
        if (res.data.failed_count > 0) {
          setError(`${res.data.failed_count} note(s) failed to update.`);
        }
      })
      .catch(() => {
        setError("Failed to remove selected notes.");
      })
      .finally(() => {
        setRemoving(false);
      });

    await loadMembership();
  };

  const selectionMissing = !selectedModule || !selectedCategory;

  return (
    <Stack spacing={3} sx={{ px: { xs: 0, sm: 2 }, width: "100%" }}>
      <PageHeaderCard
        icon={<FaTableColumns size={18} style={{ color: "#6b6b6b" }} />}
        title="Organisation Tool"
        titleVariant="h5"
        description="Select a module and category, then add or remove notes in bulk."
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Modules
            </Typography>
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
                      setSelectedInPaths([]);
                      setSelectedNotInPaths([]);
                      setSuccess(null);
                      setError(null);
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
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Categories
            </Typography>
            <List dense disablePadding>
              {categories.map((category) => (
                <ListItemButton
                  key={category.id}
                  selected={selectedCategory?.id === category.id}
                  onClick={() => {
                    setSelectedCategory(category);
                    setSelectedInPaths([]);
                    setSelectedNotInPaths([]);
                    setSuccess(null);
                    setError(null);
                  }}
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
        </Stack>
      </PageHeaderCard>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Paper elevation={0} sx={{ borderRadius: "6px", p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                In Category ({filteredInCategory.length})
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() =>
                  toggleSelectAll(
                    filteredInCategory.map((file) => file.path),
                    selectedInPaths,
                    setSelectedInPaths,
                  )
                }
                disabled={selectionMissing || filteredInCategory.length === 0}
              >
                Select all
              </Button>
            </Stack>

            <TextField
              fullWidth
              size="small"
              placeholder="Search notes in category"
              value={inSearch}
              onChange={(event) => setInSearch(event.target.value)}
              sx={{ mb: 1.5 }}
            />

            {loadingMembership ? (
              <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <List dense disablePadding>
                {filteredInCategory.map((file) => (
                  <ListItemButton
                    key={file.path}
                    onClick={() => togglePath(file.path, setSelectedInPaths)}
                    sx={{ borderRadius: "6px", px: 1 }}
                    disabled={selectionMissing}
                  >
                    <Checkbox checked={selectedInPaths.includes(file.path)} disableRipple />
                    <ListItemText primary={file.name} secondary={file.path} />
                  </ListItemButton>
                ))}
                {!selectionMissing && filteredInCategory.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                    No notes currently in this category.
                  </Typography>
                )}
              </List>
            )}

            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 1.5 }}
              disabled={
                selectionMissing || loadingMembership || removing || selectedInPaths.length === 0
              }
              onClick={removeSelected}
            >
              {removing ? "Removing..." : `Remove Selected (${selectedInPaths.length})`}
            </Button>
          </Box>

          <Divider flexItem orientation="vertical" sx={{ display: { xs: "none", md: "block" } }} />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Not In Category ({filteredNotInCategory.length})
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() =>
                  toggleSelectAll(
                    filteredNotInCategory.map((file) => file.path),
                    selectedNotInPaths,
                    setSelectedNotInPaths,
                  )
                }
                disabled={selectionMissing || filteredNotInCategory.length === 0}
              >
                Select all
              </Button>
            </Stack>

            <TextField
              fullWidth
              size="small"
              placeholder="Search notes not in category"
              value={notInSearch}
              onChange={(event) => setNotInSearch(event.target.value)}
              sx={{ mb: 1.5 }}
            />

            {loadingMembership ? (
              <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <List dense disablePadding>
                {filteredNotInCategory.map((file) => (
                  <ListItemButton
                    key={file.path}
                    onClick={() => togglePath(file.path, setSelectedNotInPaths)}
                    sx={{ borderRadius: "6px", px: 1 }}
                    disabled={selectionMissing}
                  >
                    <Checkbox checked={selectedNotInPaths.includes(file.path)} disableRipple />
                    <ListItemText primary={file.name} secondary={file.path} />
                  </ListItemButton>
                ))}
                {!selectionMissing && filteredNotInCategory.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                    Every note is already in this category.
                  </Typography>
                )}
              </List>
            )}

            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 1.5 }}
              disabled={
                selectionMissing || loadingMembership || applying || selectedNotInPaths.length === 0
              }
              onClick={addSelected}
            >
              {applying ? "Adding..." : `Add Selected (${selectedNotInPaths.length})`}
            </Button>
          </Box>
        </Stack>

        {selectionMissing && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Choose a module and category to load membership lists.
          </Typography>
        )}
      </Paper>
    </Stack>
  );
}

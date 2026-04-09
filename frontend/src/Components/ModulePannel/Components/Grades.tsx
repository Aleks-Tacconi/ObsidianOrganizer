import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { FaPenToSquare, FaPlus, FaTrashCan, FaTrophy } from "react-icons/fa6";

import ConfirmDialogue from "../../ConfirmDialogue/ConfirmDialogue";
import type { RuntimeGrade, RuntimeModuleInfo } from "../../../Utils/useModuleNotes";

export type GradeFormValues = {
  name: string;
  percentage: number;
  scored: number;
};

type Props = {
  moduleInfo: RuntimeModuleInfo;
  embedded?: boolean;
  onSaveGrade: (gradeId: number | null, values: GradeFormValues) => Promise<void>;
  onDeleteGrade: (gradeId: number) => Promise<void>;
};

const emptyForm = {
  name: "",
  percentage: "",
  scored: "",
};

type FormState = {
  name: string;
  percentage: string;
  scored: string;
};

function parseGradeForm(form: FormState): { values?: GradeFormValues; error?: string } {
  const name = form.name.trim();
  const percentage = Number(form.percentage);
  const scored = Number(form.scored);

  if (!name) {
    return { error: "Assessment name is required." };
  }

  if (form.percentage.trim() === "" || Number.isNaN(percentage)) {
    return { error: "Weight must be a number between 0 and 100." };
  }

  if (form.scored.trim() === "" || Number.isNaN(scored)) {
    return { error: "Score must be a number between 0 and 100." };
  }

  if (percentage < 0 || percentage > 100) {
    return { error: "Weight must be between 0 and 100." };
  }

  if (scored < 0 || scored > 100) {
    return { error: "Score must be between 0 and 100." };
  }

  return {
    values: {
      name,
      percentage,
      scored,
    },
  };
}

function toFormState(grade?: RuntimeGrade | null): FormState {
  if (!grade) {
    return emptyForm;
  }

  return {
    name: grade.name,
    percentage: String(grade.percentage),
    scored: String(grade.scored),
  };
}

export default function Grades({
  moduleInfo,
  embedded = false,
  onSaveGrade,
  onDeleteGrade,
}: Props) {
  const [areGradesVisible, setAreGradesVisible] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<RuntimeGrade | null>(null);
  const [confirmDeleteGrade, setConfirmDeleteGrade] = useState<RuntimeGrade | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const gradeProgress = useMemo(() => moduleInfo.grades.reduce(
    (totals, grade) => {
      const contribution = (grade.percentage * grade.scored) / 100;

      return {
        totalWeight: totals.totalWeight + grade.percentage,
        completed: totals.completed + contribution,
        missed: totals.missed + (grade.percentage - contribution),
      };
    },
    { totalWeight: 0, completed: 0, missed: 0 },
  ), [moduleInfo.grades]);

  const na = Math.max(100 - gradeProgress.totalWeight, 0);
  const hasOverflow = gradeProgress.totalWeight > 100;
  const weightedAverage = gradeProgress.totalWeight > 0
    ? (gradeProgress.completed / gradeProgress.totalWeight) * 100
    : 0;
  const segments = [
    { label: "Completed", value: gradeProgress.completed, color: moduleInfo.primary_tag.color },
    { label: "Missed", value: gradeProgress.missed, color: "rgba(255,255,255,0.2)" },
    { label: "N/A", value: na, color: "rgba(255,255,255,0.08)" },
  ].filter((segment) => segment.value > 0);

  const openCreateDialog = () => {
    setEditingGrade(null);
    setForm(emptyForm);
    setFormError(null);
    setActionError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (grade: RuntimeGrade) => {
    setEditingGrade(grade);
    setForm(toFormState(grade));
    setFormError(null);
    setActionError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialogOpen(false);
    setEditingGrade(null);
    setFormError(null);
  };

  const handleSubmit = async () => {
    const parsed = parseGradeForm(form);
    if (!parsed.values) {
      setFormError(parsed.error ?? "Invalid grade details.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setActionError(null);

    try {
      await onSaveGrade(editingGrade?.id ?? null, parsed.values);
      setDialogOpen(false);
      setEditingGrade(null);
      setForm(emptyForm);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to save grade. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteGrade) return;

    setDeleting(true);
    setActionError(null);

    try {
      await onDeleteGrade(confirmDeleteGrade.id);
      setConfirmDeleteGrade(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete grade. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ p: embedded ? 0 : 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <FaTrophy size={15} style={{ color: moduleInfo.primary_tag.color }} />
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={embedded ? { letterSpacing: "0.12em", textTransform: "uppercase" } : undefined}
          >
            Grades
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            onClick={() => setAreGradesVisible((previous) => !previous)}
            sx={{ textTransform: "none" }}
          >
            {areGradesVisible ? "Hide grades" : "Show grades"}
          </Button>

          <Button
            variant="outlined"
            color="inherit"
            size="small"
            onClick={openCreateDialog}
            startIcon={<FaPlus size={12} />}
            sx={{ textTransform: "none" }}
          >
            Add grade
          </Button>
        </Stack>
      </Stack>

      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)} sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      {moduleInfo.grades.length > 0 ? (
        <Stack spacing={embedded ? 0 : 1} sx={{ mb: 2.5 }}>
          {moduleInfo.grades.map((grade) => {
            const contribution = (grade.percentage * grade.scored) / 100;

            return (
              <Stack
                key={grade.id}
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                sx={{
                  py: embedded ? 0.875 : 0,
                  borderBottom: embedded ? "1px solid rgba(255,255,255,0.05)" : "none",
                  "&:last-of-type": {
                    borderBottom: "none",
                  },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" color="text.primary">
                    {grade.name}
                  </Typography>
                  {areGradesVisible && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {grade.percentage.toFixed(1)}% weight · {grade.scored.toFixed(1)}% score · {contribution.toFixed(1)}% earned
                    </Typography>
                  )}
                </Box>

                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Tooltip title={`Edit ${grade.name}`}>
                    <IconButton aria-label={`Edit ${grade.name}`} onClick={() => openEditDialog(grade)}>
                      <FaPenToSquare size={14} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={`Delete ${grade.name}`}>
                    <span>
                      <IconButton
                        aria-label={`Delete ${grade.name}`}
                        onClick={() => {
                          setActionError(null);
                          setConfirmDeleteGrade(grade);
                        }}
                        disabled={deleting}
                      >
                        {deleting && confirmDeleteGrade?.id === grade.id
                          ? <CircularProgress size={14} color="inherit" />
                          : <FaTrashCan size={14} />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          No grades tracked for this module yet.
        </Typography>
      )}

      <Box
        role="img"
        aria-label={areGradesVisible
          ? `Grade progress: ${gradeProgress.completed.toFixed(1)} percent completed, ${gradeProgress.missed.toFixed(1)} percent missed, ${na.toFixed(1)} percent not applicable`
          : "Grade progress bar"}
        sx={{
          display: "flex",
          width: "100%",
          height: 8,
          borderRadius: "6px",
          overflow: "hidden",
          backgroundColor: "rgba(255,255,255,0.07)",
        }}
      >
        {segments.map((segment) => (
          <Box
            key={segment.label}
            sx={{
              width: `${segment.value}%`,
              backgroundColor: segment.color,
            }}
          />
        ))}
      </Box>

      {areGradesVisible && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {gradeProgress.completed.toFixed(1)}% completed
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {gradeProgress.missed.toFixed(1)}% missed
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {na.toFixed(1)}% N/A
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            {weightedAverage.toFixed(1)}% average
          </Typography>
        </Stack>
      )}

      {hasOverflow && (
        <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: "block" }}>
          Tracked assessments exceed 100% of this module.
        </Typography>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{paddingBottom: 2}}>{editingGrade ? "Edit Grade" : "Add Grade"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1, pt: 1, overflow: "visible" }}>
          {formError && (
            <Alert severity="error" onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}

          <TextField
            label="Assessment name"
            value={form.name}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, name: event.target.value }));
              if (formError) setFormError(null);
            }}
            fullWidth
            autoFocus
            size="small"
            sx={{ mt: 0.5 }}
          />

          <TextField
            label="Weight (%)"
            type="number"
            value={form.percentage}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, percentage: event.target.value }));
              if (formError) setFormError(null);
            }}
            fullWidth
            size="small"
            inputProps={{ min: 0, max: 100, step: 0.1 }}
          />

          <TextField
            label="Score (%)"
            type="number"
            value={form.scored}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, scored: event.target.value }));
              if (formError) setFormError(null);
            }}
            fullWidth
            size="small"
            inputProps={{ min: 0, max: 100, step: 0.1 }}
            helperText="Module contribution is calculated as weight × score."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={submitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : null}
          >
            {submitting ? "Saving..." : editingGrade ? "Save changes" : "Add grade"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialogue
        open={Boolean(confirmDeleteGrade)}
        onConfirm={() => void handleDelete()}
        onDecline={() => {
          if (deleting) return;
          setConfirmDeleteGrade(null);
        }}
        title={`Delete "${confirmDeleteGrade?.name ?? "grade"}"`}
        message="This grade will be permanently deleted."
        confirmLabel={deleting ? "Deleting..." : "Delete"}
      />
    </Box>
  );
}

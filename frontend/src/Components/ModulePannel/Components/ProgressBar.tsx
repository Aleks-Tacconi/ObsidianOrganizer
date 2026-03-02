import { LinearProgress, Box, Typography, Stack } from "@mui/material";
import { FaCircleCheck } from "react-icons/fa6";
import type { Note as NoteType } from "../../../Utils/types/api.schemas";

type ProgressBarProps = {
  Notes: NoteType[];
  color?: string;
};

export default function ProgressBar({ Notes, color }: ProgressBarProps) {
  const total = Notes.length;
  const completed = Notes.filter((n) => n.completed).length;
  const progress = total === 0 ? 0 : (completed / total) * 100;

  if (total === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No lectures added yet.
      </Typography>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
        <FaCircleCheck size={14} style={{ color: color ?? "#e0e0e0", flexShrink: 0 }} />
        <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
          {completed} / {total} lectures completed
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ ml: "auto !important" }}>
          {Math.round(progress)}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress}
        aria-label="Lecture completion progress"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        sx={{ "& .MuiLinearProgress-bar": { backgroundColor: color ?? "#e0e0e0" } }}
      />
    </Box>
  );
}

import { LinearProgress, Box, Typography } from "@mui/material";
import type { Note as NoteType } from "../../../Utils/types/api.schemas";

type ProgressBarProps = {
  Notes: NoteType[];
};

export default function ProgressBar({ Notes }: ProgressBarProps) {
  const total = Notes.length;
  const completed = Notes.filter((n) => n.completed).length;
  const progress = total === 0 ? 0 : (completed / total) * 100;

  if (total === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        No lectures added yet.
      </Typography>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <LinearProgress
        variant="determinate"
        value={progress}
        aria-label="Lecture completion progress"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      />
      <Typography variant="body2" color="text.primary" sx={{ mt: 1 }}>
        {completed} / {total} lectures completed
      </Typography>
    </Box>
  );
}

import { LinearProgress, Box, Typography, Stack } from "@mui/material";
import { FaCircleCheck } from "react-icons/fa6";
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
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
        <FaCircleCheck size={12} style={{ color: "#e0e0e0", flexShrink: 0 }} />
        <Typography variant="body2" color="text.primary">
          {completed} / {total} lectures completed
        </Typography>
      </Stack>
    </Box>
  );
}

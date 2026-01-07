import { LinearProgress, Box, Typography } from "@mui/material";
import type { Note as NoteType } from "../../../Utils/types/api.schemas";

type ProgressBarProps = {
  Notes: NoteType[];
};

export default function ProgressBar({ Notes }: ProgressBarProps) {
  const total = Notes.length;
  const completed = Notes.filter((n) => n.completed).length;
  const progress = total === 0 ? 0 : (completed / total) * 100;

  return (
    <Box sx={{ width: "100%" }}>
      <LinearProgress variant="determinate" value={progress} />
      <Typography variant="body2" sx={{ mt: 1 }}>
        {completed} / {total} completed
      </Typography>
    </Box>
  );
}

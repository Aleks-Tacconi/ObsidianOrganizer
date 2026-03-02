import { Box, Typography, LinearProgress, Stack, Paper } from "@mui/material";
import { FaTrophy } from "react-icons/fa6";
import type { ModuleInfo } from "../../../Utils/types/api.schemas";

type Props = {
  moduleInfo: ModuleInfo;
};

export default function Grades({ moduleInfo }: Props) {
  const calcGradeProgress = () => {
    if (!moduleInfo || moduleInfo.grades.length === 0) return { achieved: 0 };
    const total = moduleInfo.grades.reduce((sum, g) => sum + g.percentage, 0);
    const scored = moduleInfo.grades.reduce((sum, g) => sum + g.scored, 0);
    return { achieved: total > 0 ? (scored / total) * 100 : 0 };
  };

  const { achieved } = calcGradeProgress();

  return (
    <Paper elevation={0} sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
        <FaTrophy size={15} style={{ color: moduleInfo.primary_tag.color }} />
        <Typography variant="subtitle2" color="text.secondary">
          Grades
        </Typography>
      </Stack>

      {/* Grade rows */}
      <Stack spacing={1} sx={{ mb: 2.5 }}>
        {moduleInfo.grades.map((g) => (
          <Box
            key={g.id}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="text.primary">
              {g.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {g.scored} / {g.percentage}
            </Typography>
          </Box>
        ))}
      </Stack>

      {/* Overall progress */}
      <LinearProgress
        variant="determinate"
        value={achieved}
        aria-label="Grade progress"
        sx={{ "& .MuiLinearProgress-bar": { backgroundColor: moduleInfo.primary_tag.color } }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        {achieved.toFixed(1)}% overall
      </Typography>
    </Paper>
  );
}

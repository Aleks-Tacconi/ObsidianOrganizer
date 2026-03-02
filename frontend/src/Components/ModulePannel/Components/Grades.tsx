import { Box, Typography, LinearProgress, Stack } from "@mui/material";
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
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Grades
      </Typography>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        {moduleInfo.grades.map((g) => (
          <Typography key={g.id} variant="body2" color="text.secondary">
            {g.name}: {g.scored} / {g.percentage} marks
          </Typography>
        ))}
      </Stack>
      <LinearProgress
        variant="determinate"
        value={achieved}
        sx={{ height: 6 }}
        aria-label="Grade progress"
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
        {achieved.toFixed(1)}% overall
      </Typography>
    </Box>
  );
}

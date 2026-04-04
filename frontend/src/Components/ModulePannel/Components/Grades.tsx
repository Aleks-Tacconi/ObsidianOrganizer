import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import { FaTrophy } from "react-icons/fa6";
import type { RuntimeModuleInfo } from "../../../Utils/useModuleNotes";

type Props = {
  moduleInfo: RuntimeModuleInfo;
  embedded?: boolean;
};

export default function Grades({ moduleInfo, embedded = false }: Props) {
  const calcGradeProgress = () => {
    if (!moduleInfo || moduleInfo.grades.length === 0) return { achieved: 0 };
    const total = moduleInfo.grades.reduce((sum, g) => sum + g.percentage, 0);
    const scored = moduleInfo.grades.reduce((sum, g) => sum + g.scored, 0);
    return { achieved: total > 0 ? (scored / total) * 100 : 0 };
  };

  const { achieved } = calcGradeProgress();

  return (
    <Box sx={{ p: embedded ? 0 : 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
        <FaTrophy size={15} style={{ color: moduleInfo.primary_tag.color }} />
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={embedded ? { letterSpacing: "0.12em", textTransform: "uppercase" } : undefined}
        >
          Grades
        </Typography>
      </Stack>

      {/* Grade rows */}
      {moduleInfo.grades.length > 0 ? (
        <Stack spacing={embedded ? 0 : 1} sx={{ mb: 2.5 }}>
          {moduleInfo.grades.map((g) => (
            <Box
              key={g.id}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: embedded ? 0.875 : 0,
                borderBottom: embedded ? "1px solid rgba(255,255,255,0.05)" : "none",
                "&:last-of-type": {
                  borderBottom: "none",
                },
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
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          No grades tracked for this module yet.
        </Typography>
      )}

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
    </Box>
  );
}

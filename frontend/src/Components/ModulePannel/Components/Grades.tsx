import { Box, Stack, Typography } from "@mui/material";
import { FaTrophy } from "react-icons/fa6";
import type { RuntimeModuleInfo } from "../../../Utils/useModuleNotes";

type Props = {
  moduleInfo: RuntimeModuleInfo;
  embedded?: boolean;
};

export default function Grades({ moduleInfo, embedded = false }: Props) {
  const gradeProgress = moduleInfo.grades.reduce(
    (totals, grade) => {
      const contribution = (grade.percentage * grade.scored) / 100;

      return {
        totalWeight: totals.totalWeight + grade.percentage,
        completed: totals.completed + contribution,
        missed: totals.missed + (grade.percentage - contribution),
      };
    },
    { totalWeight: 0, completed: 0, missed: 0 },
  );

  const na = Math.max(100 - gradeProgress.totalWeight, 0);
  const hasOverflow = gradeProgress.totalWeight > 100;
  const segments = [
    { label: "Completed", value: gradeProgress.completed, color: moduleInfo.primary_tag.color },
    { label: "Missed", value: gradeProgress.missed, color: "rgba(255,255,255,0.2)" },
    { label: "N/A", value: na, color: "rgba(255,255,255,0.08)" },
  ].filter((segment) => segment.value > 0);

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

      {moduleInfo.grades.length > 0 ? (
        <Stack spacing={embedded ? 0 : 1} sx={{ mb: 2.5 }}>
          {moduleInfo.grades.map((g) => (
            <Stack
              key={g.id}
              direction={{ xs: "column", sm: "row" }}
              spacing={0.5}
              justifyContent="space-between"
              sx={{
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
                {g.percentage.toFixed(1)}% weight · {g.scored.toFixed(1)}% score · {((g.percentage * g.scored) / 100).toFixed(1)}% earned
              </Typography>
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          No grades tracked for this module yet.
        </Typography>
      )}

      <Box
        role="img"
        aria-label={`Grade progress: ${gradeProgress.completed.toFixed(1)} percent completed, ${gradeProgress.missed.toFixed(1)} percent missed, ${na.toFixed(1)} percent not applicable`}
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
      </Stack>

      {hasOverflow && (
        <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: "block" }}>
          Tracked assessments exceed 100% of this module.
        </Typography>
      )}
    </Box>
  );
}

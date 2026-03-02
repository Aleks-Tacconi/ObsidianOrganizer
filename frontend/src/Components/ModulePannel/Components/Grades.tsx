import { Box, Typography, LinearProgress, Stack } from "@mui/material";
import type { ModuleInfo } from "../../../Utils/types/api.schemas";

type Props = {
    moduleInfo: ModuleInfo;
};

export default function Grades({ moduleInfo }: Props) {
    const calcGradeProgress = () => {
        if (!moduleInfo || moduleInfo.grades.length === 0) return { achieved: 0, remaining: 100 };
        const total = moduleInfo.grades.reduce((sum, g) => sum + g.percentage, 0);
        const achieved = moduleInfo.grades.reduce((sum, g) => sum + g.scored, 0);
        return {
            achieved: (achieved / total) * 100,
            remaining: 100 - (achieved / total) * 100,
        };
    };

    if (!moduleInfo) return <Typography color="text.secondary">Loading...</Typography>;

    const { achieved } = calcGradeProgress();

    return (
        <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Grades
            </Typography>
            <Stack spacing={1} sx={{ mb: 2 }}>
                {moduleInfo.grades.map((g) => (
                    <Typography key={g.id} variant="body2" color="text.secondary">
                        {g.name}: {g.scored}/{g.percentage}
                    </Typography>
                ))}
            </Stack>
            <LinearProgress
                variant="determinate"
                value={achieved}
                sx={{ height: 6 }}
            />
        </Box>
    );
}

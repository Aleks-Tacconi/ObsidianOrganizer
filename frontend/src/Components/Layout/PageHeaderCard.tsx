import type { ReactNode } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";

type PageHeaderCardProps = {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  titleVariant?: "h4" | "h5" | "h6";
  descriptionMaxWidth?: number | string;
};

export default function PageHeaderCard({
  icon,
  title,
  description,
  actions,
  children,
  titleVariant = "h4",
  descriptionMaxWidth = 920,
}: PageHeaderCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, md: 3 },
        borderRadius: "6px",
        border: "1px solid rgba(255,255,255,0.07)",
        backgroundColor: "#141414",
      }}
    >
      <Stack spacing={children ? 3 : 0}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: description ? 1 : 0 }}>
              {icon}
              <Typography variant={titleVariant} sx={{ textWrap: "balance" }}>
                {title}
              </Typography>
            </Stack>
            {description && (
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: descriptionMaxWidth }}>
                {description}
              </Typography>
            )}
          </Box>

          {actions && (
            <Box sx={{ flexShrink: 0, width: { xs: "100%", md: "auto" } }}>
              {actions}
            </Box>
          )}
        </Stack>

        {children && <Box>{children}</Box>}
      </Stack>
    </Paper>
  );
}

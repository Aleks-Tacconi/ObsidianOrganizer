import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import "./App.css";
import Dashboard from "./Pages/Dashboard/Dashboard";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0a0a0a",
      paper: "#141414",
    },
    primary: {
      main: "#e0e0e0",
      contrastText: "#0a0a0a",
    },
    text: {
      primary: "#ededed",
      secondary: "#6b6b6b",
    },
    divider: "rgba(255,255,255,0.07)",
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    fontSize: 15,
    button: {
      textTransform: "none",
    },
    h4: {
      fontSize: "2rem",
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h5: {
      fontSize: "1.4rem",
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h6: {
      fontSize: "1.05rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: "0.95rem",
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: "0.72rem",
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
    },
    body1: {
      fontSize: "0.95rem",
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.6,
    },
    caption: {
      fontSize: "0.78rem",
    },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          transition: "all 150ms ease-out",
          "&:hover": {
            boxShadow: "none",
            transform: "scale(1.01)",
          },
        },
        containedPrimary: {
          backgroundColor: "#e0e0e0",
          color: "#0a0a0a",
          "&:hover": {
            backgroundColor: "#c8c8c8",
          },
        },
        outlined: {
          borderColor: "rgba(255,255,255,0.12)",
          color: "#ededed",
          "&:hover": {
            backgroundColor: "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.2)",
          },
        },
        text: {
          color: "#ededed",
          "&:hover": {
            backgroundColor: "rgba(255,255,255,0.04)",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: "#6b6b6b",
          transition: "color 150ms ease-out",
          "&:hover": {
            color: "#ededed",
            backgroundColor: "rgba(255,255,255,0.04)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "none",
          border: "1px solid rgba(255,255,255,0.07)",
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: "16px",
          "&:last-child": {
            paddingBottom: "16px",
          },
        },
      },
    },
    MuiCardActions: {
      styleOverrides: {
        root: {
          padding: "8px 16px 12px",
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: "16px 16px 8px",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "none",
          border: "1px solid rgba(255,255,255,0.07)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#141414",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "none",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "rgba(255,255,255,0.07)",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: "6px",
          minHeight: "40px",
          transition: "background-color 150ms ease-out",
          "&:hover": {
            backgroundColor: "rgba(255,255,255,0.04)",
          },
          "&.Mui-selected": {
            backgroundColor: "rgba(255,255,255,0.06)",
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.08)",
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: "#1c1c1c",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 8,
          backgroundColor: "rgba(255,255,255,0.07)",
          borderRadius: "6px",
        },
        bar: {
          backgroundColor: "#e0e0e0",
          borderRadius: "6px",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: "6px",
          height: "24px",
          fontSize: "0.75rem",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: "0.78rem",
          backgroundColor: "#2a2a2a",
          border: "1px solid rgba(255,255,255,0.07)",
        },
      },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Dashboard />
    </ThemeProvider>
  );
}

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
    button: {
      textTransform: "none",
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
          borderColor: "rgba(255,255,255,0.07)",
          color: "#ededed",
          "&:hover": {
            backgroundColor: "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.12)",
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
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
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
          boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(255,255,255,0.07)",
          borderRadius: "6px",
        },
        bar: {
          backgroundColor: "#e0e0e0",
          borderRadius: "6px",
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

import { createTheme } from "@mui/material/styles";

const APP_BAR_HEIGHT = 58;
const BOARD_BAR_HEIGHT = 60;
const BOARD_CONTENT_HEIGHT = `calc(100vh - (${APP_BAR_HEIGHT}px + ${BOARD_BAR_HEIGHT}px))`;
const COLUMN_HEADER_HEIGHT = 50;
const COLUMN_FOOTER_HEIGHT = 56;

const theme = createTheme({
  trellify: {
    appBarHeight: APP_BAR_HEIGHT,
    boardBarHeight: BOARD_BAR_HEIGHT,
    boardContentHeight: BOARD_CONTENT_HEIGHT,
    columnHeaderHeight: COLUMN_HEADER_HEIGHT,
    columnFooterHeight: COLUMN_FOOTER_HEIGHT,
  },
  colorSchemes: {
    light: {},
    dark: {},
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          "*::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
          },
          "*::-webkit-scrollbar-thumb": {
            backgroundColor: "#dcdde1",
            borderRadius: "8px",
          },
          "*::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "white",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderWidth: "1px",
          "&:hover": {
            borderWidth: "1px",
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          "&.MuiTypography-body1": {
            fontSize: "0.875rem",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
          "& fieldset": { borderWidth: "1px !important" },
          "&:hover fieldset": { borderWidth: "2px !important" },
          "&.Mui-focused fieldset": { borderWidth: "2px !important" },
        },
      },
    },
  },
});

export default theme;

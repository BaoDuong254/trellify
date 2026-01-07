import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Theme {
    trellify: {
      appBarHeight: number;
      boardBarHeight: number;
    };
  }

  interface ThemeOptions {
    trellify?: {
      appBarHeight?: number;
      boardBarHeight?: number;
    };
  }
}

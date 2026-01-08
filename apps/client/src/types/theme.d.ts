import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Theme {
    trellify: {
      appBarHeight: number;
      boardBarHeight: number;
      boardContentHeight: number | string;
      columnHeaderHeight: number;
      columnFooterHeight: number;
    };
  }

  interface ThemeOptions {
    trellify?: {
      appBarHeight?: number;
      boardBarHeight?: number;
      boardContentHeight?: number | string;
      columnHeaderHeight?: number;
      columnFooterHeight?: number;
    };
  }
}

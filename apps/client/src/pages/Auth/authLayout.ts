import type { SxProps, Theme } from "@mui/material/styles";

export const authPageSx: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  alignItems: "center",
  justifyContent: "flex-start",
};

export const authCardSx: SxProps<Theme> = {
  minWidth: 380,
  maxWidth: 380,
  marginTop: "6em",
  "@keyframes authCardIn": {
    from: { transform: "translateY(12px) scale(0.98)" },
    to: { transform: "none" },
  },
  animation: "authCardIn 260ms ease-out",
  "@media (prefers-reduced-motion: reduce)": {
    animation: "none",
  },
};

import Card from "@/pages/Boards/BoardContent/ListColumns/Column/ListCards/Card/Card";
import Box from "@mui/material/Box";

function ListCards() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        p: "0 5px",
        m: "0 5px",
        overflowY: "auto",
        overflowX: "hidden",
        maxHeight: (theme) =>
          `calc(${theme.trellify.boardContentHeight} - ${theme.spacing(5)} - ${theme.trellify.columnHeaderHeight}px - ${theme.trellify.columnFooterHeight}px)`,
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "#ced0da",
        },
        "&::-webkit-scrollbar-thumb:hover": {
          backgroundColor: "#bfc2cf",
        },
      }}
    >
      <Card />
      <Card temporaryHideMedia />
      <Card temporaryHideMedia />
      <Card temporaryHideMedia />
      <Card temporaryHideMedia />
      <Card temporaryHideMedia />
    </Box>
  );
}
export default ListCards;

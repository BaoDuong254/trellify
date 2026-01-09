import ListColumns from "@/pages/Boards/BoardContent/ListColumns/ListColumns";
import Box from "@mui/material/Box";

function BoardContent() {
  return (
    <Box
      sx={{
        bgcolor: (theme) => (theme.palette.mode === "dark" ? "#34495e" : "#1976d2"),
        width: "100%",
        height: (theme) => theme.trellify.boardContentHeight,
        p: "10px 0",
      }}
    >
      <ListColumns />
    </Box>
  );
}
export default BoardContent;

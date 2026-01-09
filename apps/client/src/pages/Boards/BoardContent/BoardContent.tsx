import ListColumns from "@/pages/Boards/BoardContent/ListColumns/ListColumns";
import type { Board } from "@/types/board.type";
import { mapOrder } from "@/utils/sort";
import Box from "@mui/material/Box";

function BoardContent({ board }: { board: Board }) {
  const orderedColumns = mapOrder(board?.columns, board?.columnOrderIds, "_id");
  return (
    <Box
      sx={{
        bgcolor: (theme) => (theme.palette.mode === "dark" ? "#34495e" : "#1976d2"),
        width: "100%",
        height: (theme) => theme.trellify.boardContentHeight,
        p: "10px 0",
      }}
    >
      <ListColumns columns={orderedColumns} />
    </Box>
  );
}
export default BoardContent;

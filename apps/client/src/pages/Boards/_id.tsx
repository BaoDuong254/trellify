import AppBar from "src/components/AppBar/AppBar";
import BoardBar from "src/pages/Boards/BoardBar/BoardBar";
import BoardContent from "src/pages/Boards/BoardContent/BoardContent";
import Container from "@mui/material/Container";
import { useEffect, useState } from "react";
import { fetchBoardDetailsAPI } from "src/apis";
import type { Board as BoardType } from "src/types/board.type";

function Board() {
  const [board, setBoard] = useState<BoardType | undefined>(undefined);
  useEffect(() => {
    const boardId = "696cf8e1464f12fbc4ad6c37";
    fetchBoardDetailsAPI(boardId).then((board) => {
      setBoard(board);
    });
  }, []);

  return (
    <Container sx={{ height: "100vh", backgroundColor: "primary.main" }} disableGutters maxWidth={false}>
      <AppBar />
      <BoardBar board={board} />
      <BoardContent board={board} />
    </Container>
  );
}
export default Board;

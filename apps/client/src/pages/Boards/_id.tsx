import AppBar from "src/components/AppBar/AppBar";
import BoardBar from "src/pages/Boards/BoardBar/BoardBar";
import BoardContent from "src/pages/Boards/BoardContent/BoardContent";
import Container from "@mui/material/Container";
import { useEffect, useState } from "react";
import { fetchBoardDetailsAPI } from "src/apis";
import type { Board as BoardType } from "src/types/board.type";
import { mockData } from "src/apis/mock-data";

function Board() {
  const [board, setBoard] = useState<BoardType>(mockData.board);
  useEffect(() => {
    const boardId = "696b27eb43125756b0a0e13f";
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

import AppBar from "src/components/AppBar/AppBar";
import BoardBar from "src/pages/Boards/BoardBar/BoardBar";
import BoardContent from "src/pages/Boards/BoardContent/BoardContent";
import Container from "@mui/material/Container";
import { useEffect, useState } from "react";
import { createNewCardAPI, createNewColumnAPI, fetchBoardDetailsAPI } from "src/apis";
import type { Board as BoardType, Card, Column } from "src/types/board.type";

function Board() {
  const [board, setBoard] = useState<BoardType | undefined>(undefined);
  useEffect(() => {
    const boardId = "696cf8e1464f12fbc4ad6c37";
    fetchBoardDetailsAPI(boardId).then((board) => {
      setBoard(board);
    });
  }, []);

  const createNewColumn = async (newColumnData: Partial<Column>): Promise<void> => {
    if (!board) return;
    const createdColumn = await createNewColumnAPI({
      title: newColumnData.title || "",
      boardId: board._id,
    });

    // createdColumn.cards = [generatePlaceholderCard(createdColumn)];
    // createdColumn.cardOrderIds = [generatePlaceholderCard(createdColumn)._id];

    // const newBoard = { ...board };
    // newBoard.columns.push(createdColumn);
    // newBoard.columnOrderIds.push(createdColumn._id);
    // setBoard(newBoard);
  };

  const createNewCard = async (newCardData: Partial<Card>): Promise<void> => {
    if (!board) return;
    const createdCard = await createNewCardAPI({
      ...newCardData,
      boardId: board._id,
    });

    // const newBoard = { ...board };
    // const columnToUpdate = newBoard.columns.find((column) => column._id === createdCard.columnId);
    // if (columnToUpdate) {
    //   if (columnToUpdate.cards.some((card) => card.FE_PlaceholderCard)) {
    //     columnToUpdate.cards = [createdCard];
    //     columnToUpdate.cardOrderIds = [createdCard._id];
    //   } else {
    //     columnToUpdate.cards.push(createdCard);
    //     columnToUpdate.cardOrderIds.push(createdCard._id);
    //   }
    // }
    // setBoard(newBoard);
  };

  return (
    <Container sx={{ height: "100vh", backgroundColor: "primary.main" }} disableGutters maxWidth={false}>
      <AppBar />
      <BoardBar board={board} />
      <BoardContent board={board} createNewColumn={createNewColumn} createNewCard={createNewCard} />
    </Container>
  );
}
export default Board;

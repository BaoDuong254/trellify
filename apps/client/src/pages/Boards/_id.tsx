import AppBar from "src/components/AppBar/AppBar";
import BoardBar from "src/pages/Boards/BoardBar/BoardBar";
import BoardContent from "src/pages/Boards/BoardContent/BoardContent";
import Container from "@mui/material/Container";
import { useEffect, useState } from "react";
import {
  createNewCardAPI,
  createNewColumnAPI,
  deleteColumnDetailsAPI,
  fetchBoardDetailsAPI,
  moveCardToDifferentColumnAPI,
  updateBoardDetailsAPI,
  updateColumnDetailsAPI,
} from "src/apis";
import type { Board as BoardType, Card, Column } from "src/types/board.type";
import { generatePlaceholderCard } from "src/utils/formatters";
import { isEmpty } from "lodash";
import { mapOrder } from "src/utils/sort";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { toast } from "react-toastify";

function Board() {
  const [board, setBoard] = useState<BoardType | undefined>(undefined);
  useEffect(() => {
    const boardId = "696cf8e1464f12fbc4ad6c37";
    fetchBoardDetailsAPI(boardId).then((board) => {
      board.columns = mapOrder(board.columns, board.columnOrderIds, "_id");

      board.columns.forEach((column) => {
        if (isEmpty(column.cards)) {
          column.cards = [generatePlaceholderCard(column)];
          column.cardOrderIds = [generatePlaceholderCard(column)._id];
        } else {
          column.cards = mapOrder(column.cards, column.cardOrderIds, "_id");
        }
      });

      setBoard(board);
    });
  }, []);

  const createNewColumn = async (newColumnData: Partial<Column>): Promise<void> => {
    if (!board) return;
    const createdColumn = await createNewColumnAPI({
      ...newColumnData,
      boardId: board._id,
    });

    const placeholderCard = generatePlaceholderCard(createdColumn);
    createdColumn.cards = [placeholderCard];
    createdColumn.cardOrderIds = [placeholderCard._id];

    setBoard({
      ...board,
      columns: [...board.columns, createdColumn],
      columnOrderIds: [...board.columnOrderIds, createdColumn._id],
    });
  };

  const createNewCard = async (newCardData: Partial<Card>): Promise<void> => {
    if (!board) return;
    const createdCard = await createNewCardAPI({
      ...newCardData,
      boardId: board._id,
    });

    setBoard({
      ...board,
      columns: board.columns.map((column) => {
        if (column._id === createdCard.columnId) {
          const hasPlaceholder = column.cards.some((card) => card.FE_PlaceholderCard);
          return {
            ...column,
            cards: hasPlaceholder ? [createdCard] : [...column.cards, createdCard],
            cardOrderIds: hasPlaceholder ? [createdCard._id] : [...column.cardOrderIds, createdCard._id],
          };
        }
        return column;
      }),
    });
  };

  const moveColumns = async (dndOrderedColumns: Column[]): Promise<void> => {
    if (!board?._id) return;
    const dndOrderedColumnsIds = dndOrderedColumns.map((col) => col._id);
    const newBoard = { ...board, columns: dndOrderedColumns, columnOrderIds: dndOrderedColumnsIds };
    setBoard(newBoard);

    await updateBoardDetailsAPI(board._id, { columnOrderIds: dndOrderedColumnsIds });
  };

  const moveCardInTheSameColumn = async (
    dndOrderedCards: Card[],
    dndOrderedCardIds: string[],
    columnId: string
  ): Promise<void> => {
    if (!board) return;
    const newBoard = { ...board };
    const columnToUpdate = newBoard.columns.find((column) => column._id === columnId);
    if (columnToUpdate) {
      columnToUpdate.cards = dndOrderedCards;
      columnToUpdate.cardOrderIds = dndOrderedCardIds;
    }
    setBoard(newBoard);

    await updateColumnDetailsAPI(columnId, { cardOrderIds: dndOrderedCardIds });
  };

  const moveCardToDifferentColumn = (
    currentCardId: string,
    prevColumnId: string,
    nextColumnId: string,
    dndOrderedColumns: Column[]
  ) => {
    if (!board) return;
    const dndOrderedColumnsIds = dndOrderedColumns.map((col) => col._id);
    const newBoard = { ...board };
    newBoard.columns = dndOrderedColumns;
    newBoard.columnOrderIds = dndOrderedColumnsIds;
    setBoard(newBoard);

    let prevCardOrderIds = dndOrderedColumns.find((col) => col._id === prevColumnId)?.cardOrderIds || [];
    if (prevCardOrderIds[0].includes("placeholder-card")) prevCardOrderIds = [];

    moveCardToDifferentColumnAPI({
      currentCardId,
      prevColumnId,
      prevCardOrderIds,
      nextColumnId,
      nextCardOrderIds: dndOrderedColumns.find((col) => col._id === nextColumnId)?.cardOrderIds || [],
    });
  };

  const deleteColumnDetails = (columnId: string) => {
    if (!board) return;
    const newBoard = { ...board };
    newBoard.columns = newBoard.columns.filter((col) => col._id !== columnId);
    newBoard.columnOrderIds = newBoard.columnOrderIds.filter((_id) => _id !== columnId);
    setBoard(newBoard);

    deleteColumnDetailsAPI(columnId).then((res) => {
      toast.success(res?.deleteResult);
    });
  };

  if (!board) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          width: "100vw",
          height: "100vh",
        }}
      >
        <CircularProgress />
        <Typography>Loading Board...</Typography>
      </Box>
    );
  }

  return (
    <Container sx={{ height: "100vh", backgroundColor: "primary.main" }} disableGutters maxWidth={false}>
      <AppBar />
      <BoardBar board={board} />
      <BoardContent
        board={board}
        createNewColumn={createNewColumn}
        createNewCard={createNewCard}
        moveColumns={moveColumns}
        moveCardInTheSameColumn={moveCardInTheSameColumn}
        moveCardToDifferentColumn={moveCardToDifferentColumn}
        deleteColumnDetails={deleteColumnDetails}
      />
    </Container>
  );
}
export default Board;

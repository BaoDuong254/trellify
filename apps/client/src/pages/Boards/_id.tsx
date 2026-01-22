import AppBar from "src/components/AppBar/AppBar";
import BoardBar from "src/pages/Boards/BoardBar/BoardBar";
import BoardContent from "src/pages/Boards/BoardContent/BoardContent";
import Container from "@mui/material/Container";
import { useEffect } from "react";
import { moveCardToDifferentColumnAPI, updateBoardDetailsAPI, updateColumnDetailsAPI } from "src/apis";
import type { Card, Column } from "src/types/board.type";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBoardDetailsAPI,
  selectCurrentActiveBoard,
  updateCurrentActiveBoard,
} from "src/redux/activeBoard/activeBoardSlice";
import type { AppDispatch } from "src/redux/store";
import { cloneDeep } from "lodash";
import { useParams } from "react-router-dom";

function Board() {
  const dispatch = useDispatch<AppDispatch>();

  const board = useSelector(selectCurrentActiveBoard);

  const { boardId } = useParams();

  useEffect(() => {
    if (boardId) {
      dispatch(fetchBoardDetailsAPI(boardId));
    }
  }, [dispatch, boardId]);

  const moveColumns = async (dndOrderedColumns: Column[]): Promise<void> => {
    if (!board?._id) return;
    const dndOrderedColumnsIds = dndOrderedColumns.map((col) => col._id);
    const newBoard = { ...board };
    newBoard.columns = dndOrderedColumns;
    newBoard.columnOrderIds = dndOrderedColumnsIds;
    dispatch(updateCurrentActiveBoard(newBoard));

    await updateBoardDetailsAPI(board._id, { columnOrderIds: dndOrderedColumnsIds });
  };

  const moveCardInTheSameColumn = async (
    dndOrderedCards: Card[],
    dndOrderedCardIds: string[],
    columnId: string
  ): Promise<void> => {
    if (!board) return;
    const newBoard = cloneDeep(board);
    const columnToUpdate = newBoard.columns.find((column) => column._id === columnId);
    if (columnToUpdate) {
      columnToUpdate.cards = dndOrderedCards;
      columnToUpdate.cardOrderIds = dndOrderedCardIds;
    }
    dispatch(updateCurrentActiveBoard(newBoard));

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
    dispatch(updateCurrentActiveBoard(newBoard));

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
        moveColumns={moveColumns}
        moveCardInTheSameColumn={moveCardInTheSameColumn}
        moveCardToDifferentColumn={moveCardToDifferentColumn}
      />
    </Container>
  );
}
export default Board;

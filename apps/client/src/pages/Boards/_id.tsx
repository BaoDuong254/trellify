import AppBar from "src/components/AppBar/AppBar";
import BoardBar from "src/pages/Boards/BoardBar/BoardBar";
import BoardContent from "src/pages/Boards/BoardContent/BoardContent";
import Container from "@mui/material/Container";
import { useEffect, useState } from "react";
import { createNewCardAPI, createNewColumnAPI, fetchBoardDetailsAPI, updateBoardDetailsAPI } from "src/apis";
import type { Board as BoardType, Card, Column } from "src/types/board.type";
import { generatePlaceholderCard } from "src/utils/formatters";
import { isEmpty } from "lodash";
import { mapOrder } from "src/utils/sort";

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

  return (
    <Container sx={{ height: "100vh", backgroundColor: "primary.main" }} disableGutters maxWidth={false}>
      <AppBar />
      <BoardBar board={board} />
      <BoardContent
        board={board}
        createNewColumn={createNewColumn}
        createNewCard={createNewCard}
        moveColumns={moveColumns}
      />
    </Container>
  );
}
export default Board;

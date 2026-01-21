import ListColumns from "src/pages/Boards/BoardContent/ListColumns/ListColumns";
import { type Card, type Board, type Column } from "src/types/board.type";
import { mapOrder } from "src/utils/sort";
import Box from "@mui/material/Box";
import {
  DndContext,
  type DragEndEvent,
  useSensor,
  useSensors,
  type DragStartEvent,
  DragOverlay,
  type DropAnimation,
  defaultDropAnimationSideEffects,
  type DragOverEvent,
  type Over,
  type Active,
  type CollisionDetection,
  closestCenter,
  pointerWithin,
  getFirstCollision,
  closestCorners,
} from "@dnd-kit/core";
import { MouseSensor, TouchSensor } from "src/lib/DndKitSensors";
import { useCallback, useEffect, useRef, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import ColumnC from "src/pages/Boards/BoardContent/ListColumns/Column/Column";
import CardC from "src/pages/Boards/BoardContent/ListColumns/Column/ListCards/Card/Card";
import { cloneDeep, isEmpty } from "lodash";
import { generatePlaceholderCard } from "src/utils/formatters";

const ACTIVE_DRAG_ITEM_TYPE = {
  COLUMN: "ACTIVE_DRAG_ITEM_TYPE_COLUMN",
  CARD: "ACTIVE_DRAG_ITEM_TYPE_CARD",
};

function BoardContent({
  board,
  createNewColumn,
  createNewCard,
  moveColumns,
}: {
  board?: Board;
  createNewColumn: (newColumnData: Partial<Column>) => Promise<void>;
  createNewCard: (newCardData: Partial<Card>) => Promise<void>;
  moveColumns: (newColumnOrderIds: Column[]) => Promise<void>;
}) {
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 500,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);
  const [orderedColumns, setOrderedColumns] = useState<Column[]>(() =>
    mapOrder(board?.columns, board?.columnOrderIds, "_id")
  );

  const [activeDragItemId, setActiveDragItemId] = useState<string | null>(null);
  const [activeDragItemType, setActiveDragItemType] = useState<string | null>(null);
  const [activeDragItemData, setActiveDragItemData] = useState<Card | Column | null>(null);
  const [oldColumnWhenDraggingCard, setOldColumnWhenDraggingCard] = useState<Column | null>(null);

  const lastOverIdRef = useRef<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
    setOrderedColumns(mapOrder(board?.columns, board?.columnOrderIds, "_id"));
  }, [board?.columns, board?.columnOrderIds]);

  const findColumnByCardId = (cardId: string) => {
    return orderedColumns.find((column) => column?.cards?.map((card) => card._id)?.includes(cardId));
  };

  const moveCardBetweenDifferentColumns = (
    over: Over,
    active: Active,
    overColumn: Column,
    overCardId: string,
    activeColumn: Column,
    activeDraggingCardId: string,
    activeDraggingCardData: Card
  ) => {
    setOrderedColumns((prevColumns) => {
      const overCardIndex = overColumn?.cards?.findIndex((card) => card._id === overCardId);

      const isBelowOverItem =
        active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
      const modifier = isBelowOverItem ? 1 : 0;
      const newCardIndex = overCardIndex >= 0 ? overCardIndex + modifier : overColumn?.cards?.length + 1;

      const nextColumns = cloneDeep(prevColumns);
      const nextActiveColumn = nextColumns.find((col) => col._id === activeColumn._id);
      const nextOverColumn = nextColumns.find((col) => col._id === overColumn._id);

      if (nextActiveColumn) {
        nextActiveColumn.cards = nextActiveColumn.cards.filter((card) => card._id !== (activeDraggingCardId as string));
        if (isEmpty(nextActiveColumn.cards)) {
          nextActiveColumn.cards = [generatePlaceholderCard(nextActiveColumn)];
        }
        nextActiveColumn.cardOrderIds = nextActiveColumn.cards.map((card) => card._id);
      }

      if (nextOverColumn) {
        nextOverColumn.cards = nextOverColumn.cards.filter((card) => card._id !== (activeDraggingCardId as string));
        const rebuildActiveDraggingCardData = {
          ...(activeDraggingCardData as Card),
          columnId: nextOverColumn._id,
        };
        nextOverColumn.cards = [
          ...nextOverColumn.cards.slice(0, newCardIndex),
          rebuildActiveDraggingCardData,
          ...nextOverColumn.cards.slice(newCardIndex),
        ];
        // Remove placeholder card if exists
        nextOverColumn.cards = nextOverColumn.cards.filter((card) => !card.FE_PlaceholderCard);
        // Update card order ids
        nextOverColumn.cardOrderIds = nextOverColumn.cards.map((card) => card._id);
      }

      return nextColumns;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItemId(event?.active?.id as string);
    setActiveDragItemType(
      event?.active?.data?.current?.columnId ? ACTIVE_DRAG_ITEM_TYPE.CARD : ACTIVE_DRAG_ITEM_TYPE.COLUMN
    );
    setActiveDragItemData(event?.active?.data?.current as Card | Column);

    if (event?.active?.data?.current?.columnId) {
      setOldColumnWhenDraggingCard(findColumnByCardId(event?.active?.id as string) as Column);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) {
      return;
    }

    const { active, over } = event;

    if (!over || !active) return;

    const {
      id: activeDraggingCardId,
      data: { current: activeDraggingCardData },
    } = active;
    const { id: overCardId } = over;

    const activeColumn = findColumnByCardId(activeDraggingCardId as string);
    const overColumn = findColumnByCardId(overCardId as string);

    if (!activeColumn || !overColumn) return;

    if (activeColumn._id !== overColumn._id) {
      moveCardBetweenDifferentColumns(
        over,
        active,
        overColumn,
        overCardId as string,
        activeColumn,
        activeDraggingCardId as string,
        activeDraggingCardData as Card
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !active) return;

    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) {
      const {
        id: activeDraggingCardId,
        data: { current: activeDraggingCardData },
      } = active;
      const { id: overCardId } = over;

      const activeColumn = findColumnByCardId(activeDraggingCardId as string);
      const overColumn = findColumnByCardId(overCardId as string);

      if (!activeColumn || !overColumn) return;

      if (oldColumnWhenDraggingCard?._id !== overColumn._id) {
        moveCardBetweenDifferentColumns(
          over,
          active,
          overColumn,
          overCardId as string,
          activeColumn,
          activeDraggingCardId as string,
          activeDraggingCardData as Card
        );
      } else {
        const oldCardIndex = oldColumnWhenDraggingCard?.cards?.findIndex((card) => card._id === activeDragItemId);
        const newCardIndex = overColumn?.cards?.findIndex((card) => card._id === overCardId);
        const dndOrderedCards = arrayMove(oldColumnWhenDraggingCard?.cards, oldCardIndex, newCardIndex);
        setOrderedColumns((prevColumns) => {
          const nextColumns = cloneDeep(prevColumns);
          const targetColumn = nextColumns.find((col) => col._id === overColumn?._id);
          if (targetColumn) {
            targetColumn.cards = dndOrderedCards;
            targetColumn.cardOrderIds = dndOrderedCards.map((card) => card._id);
          }
          return nextColumns;
        });
      }
    }

    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) {
      if (active.id !== over?.id) {
        const oldColumnIndex = orderedColumns.findIndex((col) => col._id === active.id);
        const newColumnIndex = orderedColumns.findIndex((col) => col._id === over.id);
        const dndOrderedColumns = arrayMove(orderedColumns, oldColumnIndex, newColumnIndex);
        moveColumns(dndOrderedColumns);
        setOrderedColumns(dndOrderedColumns);
      }
    }
    setActiveDragItemId(null);
    setActiveDragItemType(null);
    setActiveDragItemData(null);
    setOldColumnWhenDraggingCard(null);
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: "0.5",
        },
      },
    }),
  };

  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) {
        return closestCenter({ ...args });
      }
      const pointerIntersections = pointerWithin(args);

      if (!pointerIntersections?.length) return [];

      let overId = getFirstCollision(pointerIntersections, "id") as string | null;
      if (overId) {
        const checkColumn = orderedColumns.find((col) => col._id === overId);
        if (checkColumn) {
          overId = closestCorners({
            ...args,
            droppableContainers: args.droppableContainers.filter((container) => {
              return container.id !== overId && checkColumn?.cardOrderIds?.includes(container.id as string);
            }),
          })[0]?.id as string | null;
        }
        lastOverIdRef.current = overId;
        if (overId) {
          return [{ id: overId }];
        }
      }
      return lastOverIdRef.current ? [{ id: lastOverIdRef.current }] : [];
    },
    [activeDragItemType, orderedColumns]
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      collisionDetection={collisionDetectionStrategy}
    >
      <Box
        sx={{
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#34495e" : "#1976d2"),
          width: "100%",
          height: (theme) => theme.trellify.boardContentHeight,
          p: "10px 0",
        }}
      >
        <ListColumns columns={orderedColumns} createNewColumn={createNewColumn} createNewCard={createNewCard} />
        <DragOverlay dropAnimation={dropAnimation}>
          {!activeDragItemType && null}
          {activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN && <ColumnC column={activeDragItemData as Column} />}
          {activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD && <CardC card={activeDragItemData as Card} />}
        </DragOverlay>
      </Box>
    </DndContext>
  );
}
export default BoardContent;

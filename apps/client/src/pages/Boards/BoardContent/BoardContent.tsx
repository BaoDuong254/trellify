import ListColumns from "@/pages/Boards/BoardContent/ListColumns/ListColumns";
import { type Card, type Board, type Column } from "@/types/board.type";
import { mapOrder } from "@/utils/sort";
import Box from "@mui/material/Box";
import {
  DndContext,
  type DragEndEvent,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  type DragStartEvent,
  DragOverlay,
  type DropAnimation,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import ColumnC from "@/pages/Boards/BoardContent/ListColumns/Column/Column";
import CardC from "@/pages/Boards/BoardContent/ListColumns/Column/ListCards/Card/Card";

const ACTIVE_DRAG_ITEM_TYPE = {
  COLUMN: "ACTIVE_DRAG_ITEM_TYPE_COLUMN",
  CARD: "ACTIVE_DRAG_ITEM_TYPE_CARD",
};

function BoardContent({ board }: { board: Board }) {
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
    setOrderedColumns(mapOrder(board?.columns, board?.columnOrderIds, "_id"));
  }, [board?.columns, board?.columnOrderIds]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItemId(event?.active?.id as string);
    setActiveDragItemType(
      event?.active?.data?.current?.columnId ? ACTIVE_DRAG_ITEM_TYPE.CARD : ACTIVE_DRAG_ITEM_TYPE.COLUMN
    );
    setActiveDragItemData(event?.active?.data?.current as Card | Column);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over?.id) {
      const oldIndex = orderedColumns.findIndex((col) => col._id === active.id);
      const newIndex = orderedColumns.findIndex((col) => col._id === over.id);
      const dndOrderedColumns = arrayMove(orderedColumns, oldIndex, newIndex);
      // const dndOrderedColumnIds = dndOrderedColumns.map((col) => col._id);
      setOrderedColumns(dndOrderedColumns);
    }

    setActiveDragItemId(null);
    setActiveDragItemType(null);
    setActiveDragItemData(null);
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

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Box
        sx={{
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#34495e" : "#1976d2"),
          width: "100%",
          height: (theme) => theme.trellify.boardContentHeight,
          p: "10px 0",
        }}
      >
        <ListColumns columns={orderedColumns} />
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

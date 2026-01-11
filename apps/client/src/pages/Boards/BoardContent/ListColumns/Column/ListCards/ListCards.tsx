import Card from "src/pages/Boards/BoardContent/ListColumns/Column/ListCards/Card/Card";
import type { Card as CardType } from "src/types/board.type";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Box from "@mui/material/Box";

function ListCards({ cards }: { cards: CardType[] }) {
  return (
    <SortableContext items={cards.map((card) => card._id)} strategy={verticalListSortingStrategy}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          p: "0 5px",
          m: "0 5px",
          overflowY: "auto",
          overflowX: "hidden",
          maxHeight: (theme) =>
            `calc(${theme.trellify.boardContentHeight} - ${theme.spacing(5)} - ${theme.trellify.columnHeaderHeight}px - ${theme.trellify.columnFooterHeight}px)`,
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#ced0da",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "#bfc2cf",
          },
        }}
      >
        {cards?.map((card) => (
          <Card key={card._id} card={card} />
        ))}
      </Box>
    </SortableContext>
  );
}
export default ListCards;

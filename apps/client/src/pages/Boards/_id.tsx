import AppBar from "@/components/AppBar/AppBar";
import BoardBar from "@/pages/Boards/BoardBar/BoardBar";
import BoardContent from "@/pages/Boards/BoardContent/BoardContent";
import Container from "@mui/material/Container";
import { mockData } from "@/apis/mock-data";

function Board() {
  return (
    <Container sx={{ height: "100vh", backgroundColor: "primary.main" }} disableGutters maxWidth={false}>
      <AppBar />
      <BoardBar board={mockData?.board} />
      <BoardContent board={mockData?.board} />
    </Container>
  );
}
export default Board;

import AppBar from "src/components/AppBar/AppBar";
import BoardBar from "src/pages/Boards/BoardBar/BoardBar";
import BoardContent from "src/pages/Boards/BoardContent/BoardContent";
import Container from "@mui/material/Container";
import { mockData } from "src/apis/mock-data";

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

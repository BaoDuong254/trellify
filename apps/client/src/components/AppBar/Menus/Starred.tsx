import { fetchStarredBoardsAPI } from "src/apis";
import BoardLinksMenu from "src/components/AppBar/Menus/BoardLinksMenu";

function Starred() {
  return (
    <BoardLinksMenu id='starred' label='Starred' emptyText='No starred boards' loadBoards={fetchStarredBoardsAPI} />
  );
}
export default Starred;

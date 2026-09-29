import BoardLinksMenu from "src/components/AppBar/Menus/BoardLinksMenu";
import { getRecentBoards } from "src/utils/recentBoards";

const loadRecentBoards = () => Promise.resolve(getRecentBoards());

function Recent() {
  return <BoardLinksMenu id='recent' label='Recent' emptyText='No recent boards' loadBoards={loadRecentBoards} />;
}
export default Recent;

import AddToDriveIcon from "@mui/icons-material/AddToDrive";
import BoltIcon from "@mui/icons-material/Bolt";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";
import VpnLockIcon from "@mui/icons-material/VpnLock";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import { useConfirm } from "material-ui-confirm";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { deleteBoardAPI } from "src/apis";
import BoardUserGroup from "src/pages/Boards/BoardBar/BoardUserGroup";
import InviteBoardUser from "src/pages/Boards/BoardBar/InviteBoardUser";
import { selectCurrentUser } from "src/redux/user/userSlice";
import type { Board } from "src/types/board.type";
import { capitalizeFirstLetter } from "src/utils/formatters";

const MENU_STYLES = {
  color: "white",
  backgroundColor: "transparent",
  border: "none",
  paddingX: "5px",
  borderRadius: "4px",
  ".MuiSvgIcon-root": {
    color: "white",
  },
  "&:hover": {
    backgroundColor: "primary.50",
  },
};

function BoardBar({ board, presentUserIds }: { board?: Board; presentUserIds?: string[] }) {
  const currentUser = useSelector(selectCurrentUser);
  const confirmDeleteBoard = useConfirm();
  const navigate = useNavigate();
  const isOwner = Boolean(currentUser && board?.ownerIds.includes(currentUser._id));

  const handleDeleteBoard = () => {
    if (!board) return;
    confirmDeleteBoard({
      title: "Delete Board?",
      description: `"${board.title}" will be deleted for every member. Are you sure?`,
      confirmationText: "Delete",
      cancellationText: "Cancel",
    })
      .then(async ({ confirmed }) => {
        if (!confirmed) return;
        const result = await deleteBoardAPI(board._id);
        toast.success(result.deleteResult);
        navigate("/boards", { replace: true });
      })
      .catch(() => {});
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: (theme) => theme.trellify.boardBarHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        paddingX: 2,
        overflowX: "auto",
        bgcolor: (theme) => (theme.palette.mode === "dark" ? "#34495e" : "#1976d2"),
        "&::-webkit-scrollbar-track": {
          m: 2,
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Tooltip title={board?.description} describeChild>
          <Chip icon={<DashboardIcon />} label={board?.title} clickable sx={MENU_STYLES} />
        </Tooltip>
        <Chip icon={<VpnLockIcon />} label={capitalizeFirstLetter(board?.type)} clickable sx={MENU_STYLES} />
        <Chip icon={<AddToDriveIcon />} label='Add To Goole Drive' clickable sx={MENU_STYLES} />
        <Chip icon={<BoltIcon />} label='Automation' clickable sx={MENU_STYLES} />
        <Chip icon={<FilterListIcon />} label='Filters' clickable sx={MENU_STYLES} />
        {isOwner && (
          <Chip icon={<DeleteOutlinedIcon />} label='Delete Board' onClick={handleDeleteBoard} sx={MENU_STYLES} />
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <InviteBoardUser boardId={board?._id as string} />
        <BoardUserGroup
          boardId={board?._id}
          boardUsers={board?.FE_allUsers}
          ownerIds={board?.ownerIds}
          presentUserIds={presentUserIds}
        />
      </Box>
    </Box>
  );
}
export default BoardBar;

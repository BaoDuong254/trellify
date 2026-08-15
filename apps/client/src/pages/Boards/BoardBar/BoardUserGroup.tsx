import LogoutIcon from "@mui/icons-material/Logout";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import Tooltip from "@mui/material/Tooltip";
import { useConfirm } from "material-ui-confirm";
import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { removeBoardMemberAPI } from "src/apis";
import { fetchBoardDetailsAPI } from "src/redux/activeBoard/activeBoardSlice";
import type { AppDispatch } from "src/redux/store";
import { selectCurrentUser } from "src/redux/user/userSlice";
import type { User } from "src/types/user.type";

type BoardUser = Omit<User, "password" | "verifyToken">;

function BoardUserGroup({
  boardId,
  boardUsers,
  limit = 8,
  ownerIds,
  presentUserIds,
}: {
  boardId?: string;
  boardUsers?: BoardUser[];
  limit?: number;
  ownerIds?: string[];
  presentUserIds?: string[];
}) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const confirmRemoveMember = useConfirm();

  const [anchorPopoverElement, setAnchorPopoverElement] = useState<HTMLElement | null>(null);
  const [menuAnchorElement, setMenuAnchorElement] = useState<HTMLElement | null>(null);
  const [menuUser, setMenuUser] = useState<BoardUser | null>(null);

  const isOpenPopover = Boolean(anchorPopoverElement);
  const popoverId = isOpenPopover ? "board-all-users-popover" : undefined;
  const handleTogglePopover = (event: React.MouseEvent<HTMLElement>) => {
    if (!anchorPopoverElement) setAnchorPopoverElement(event.currentTarget);
    else setAnchorPopoverElement(null);
  };

  const ownerIdSet = useMemo(() => new Set(ownerIds ?? []), [ownerIds]);
  const isCurrentUserOwner = currentUser ? ownerIdSet.has(currentUser._id) : false;

  const canRemoveUser = (user: BoardUser): boolean =>
    isCurrentUserOwner && !ownerIdSet.has(user._id) && user._id !== currentUser?._id;
  const canLeaveAsUser = (user: BoardUser): boolean => user._id === currentUser?._id && !ownerIdSet.has(user._id);
  const hasMenuActions = (user: BoardUser): boolean => canRemoveUser(user) || canLeaveAsUser(user);

  const closeMenu = () => {
    setMenuAnchorElement(null);
    setMenuUser(null);
  };

  const handleRemoveMember = (user: BoardUser) => {
    const isSelfLeaving = user._id === currentUser?._id;
    closeMenu();
    setAnchorPopoverElement(null);

    confirmRemoveMember({
      title: isSelfLeaving ? "Leave board?" : "Remove member?",
      description: isSelfLeaving
        ? "You will lose access to this board until someone invites you again."
        : `${user.displayName} will lose access to this board and be removed from every card on it.`,
      confirmationText: "Confirm",
      cancellationText: "Cancel",
    })
      .then(({ confirmed }) => {
        if (!confirmed || !boardId) return;
        return removeBoardMemberAPI(boardId, user._id).then(() => {
          if (isSelfLeaving) {
            toast.success("You left the board.");
            navigate("/boards", { replace: true });
            return;
          }
          toast.success(`${user.displayName} was removed from the board.`);
          dispatch(fetchBoardDetailsAPI(boardId));
        });
      })
      .catch(() => {});
  };

  const renderUserAvatar = (user: BoardUser) => {
    const isViewing = presentUserIds?.includes(user?._id) ?? false;
    const tooltipTitle = isViewing ? `${user?.displayName} (viewing)` : user?.displayName;
    const avatarBadge = (
      <Badge
        overlap='circular'
        variant='dot'
        color='success'
        invisible={!isViewing}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Avatar sx={{ width: 34, height: 34 }} alt={user?.displayName} src={user?.avatar ?? ""} />
      </Badge>
    );

    if (!hasMenuActions(user)) {
      return (
        <Tooltip title={tooltipTitle} key={user?._id}>
          <Box sx={{ display: "flex", cursor: "default" }}>{avatarBadge}</Box>
        </Tooltip>
      );
    }

    return (
      <Tooltip title={tooltipTitle} key={user?._id}>
        <IconButton
          sx={{ p: 0 }}
          aria-label={`Actions for ${user?.displayName}`}
          onClick={(event) => {
            setMenuAnchorElement(event.currentTarget);
            setMenuUser(user);
          }}
        >
          {avatarBadge}
        </IconButton>
      </Tooltip>
    );
  };

  return (
    <Box sx={{ display: "flex", gap: "4px" }}>
      {boardUsers?.map((user, index) => {
        if (index < limit) {
          return renderUserAvatar(user);
        }
      })}

      {(boardUsers?.length ?? 0) > limit && (
        <Tooltip title='Show more'>
          <Box
            aria-describedby={popoverId}
            onClick={handleTogglePopover}
            sx={{
              width: 36,
              height: 36,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "500",
              borderRadius: "50%",
              color: "white",
              backgroundColor: "#a4b0be",
            }}
          >
            +{(boardUsers?.length ?? 0) - limit}
          </Box>
        </Tooltip>
      )}

      <Popover
        id={popoverId}
        open={isOpenPopover}
        anchorEl={anchorPopoverElement}
        onClose={handleTogglePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2, maxWidth: "235px", display: "flex", flexWrap: "wrap", gap: 1 }}>
          {boardUsers?.map((user) => renderUserAvatar(user))}
        </Box>
      </Popover>

      <Menu anchorEl={menuAnchorElement} open={Boolean(menuAnchorElement && menuUser)} onClose={closeMenu}>
        {menuUser && canRemoveUser(menuUser) && (
          <MenuItem onClick={() => handleRemoveMember(menuUser)}>
            <ListItemIcon>
              <PersonRemoveIcon fontSize='small' />
            </ListItemIcon>
            <ListItemText>Remove from board</ListItemText>
          </MenuItem>
        )}
        {menuUser && canLeaveAsUser(menuUser) && (
          <MenuItem onClick={() => handleRemoveMember(menuUser)}>
            <ListItemIcon>
              <LogoutIcon fontSize='small' />
            </ListItemIcon>
            <ListItemText>Leave board</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}

export default BoardUserGroup;

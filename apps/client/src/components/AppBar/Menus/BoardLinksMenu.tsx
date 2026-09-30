import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useDelayedFlag } from "src/hooks/useDelayedFlag";
import type { BoardLink } from "src/types/board.type";

function BoardLinksMenu({
  id,
  label,
  emptyText,
  loadBoards,
}: {
  id: string;
  label: string;
  emptyText: string;
  loadBoards: () => Promise<BoardLink[]>;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [boards, setBoards] = useState<BoardLink[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const open = Boolean(anchorEl);
  const showLoading = useDelayedFlag(boards === null);

  useEffect(() => {
    let cancelled = false;
    loadBoards()
      .then((result) => {
        if (!cancelled) setBoards(result);
      })
      .catch(() => {
        if (!cancelled) setBoards((previous) => previous ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [loadBoards, reloadKey]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setReloadKey((key) => key + 1);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box>
      <Button
        sx={{ color: "white" }}
        id={`basic-button-${id}`}
        aria-controls={open ? `basic-menu-${id}` : undefined}
        aria-haspopup='true'
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        endIcon={<ExpandMoreIcon />}
      >
        {label}
      </Button>
      <Menu
        id={`basic-menu-${id}`}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{ list: { "aria-labelledby": `basic-button-${id}` } }}
      >
        {!boards && showLoading && (
          <MenuItem disabled>
            <ListItemText>Loading...</ListItemText>
          </MenuItem>
        )}
        {boards?.length === 0 && (
          <MenuItem disabled>
            <ListItemText>{emptyText}</ListItemText>
          </MenuItem>
        )}
        {boards?.map((board) => (
          <MenuItem key={board._id} component={Link} to={`/boards/${board._id}`} onClick={handleClose}>
            <ListItemText>{board.title}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

export default BoardLinksMenu;

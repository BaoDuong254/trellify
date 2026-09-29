import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";

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
  const open = Boolean(anchorEl);

  const latestRequestRef = useRef(0);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setBoards(null);
    const request = ++latestRequestRef.current;
    loadBoards()
      .then((result) => {
        if (request === latestRequestRef.current) setBoards(result);
      })
      .catch(() => {
        if (request === latestRequestRef.current) setBoards([]);
      });
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
        {!boards && (
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

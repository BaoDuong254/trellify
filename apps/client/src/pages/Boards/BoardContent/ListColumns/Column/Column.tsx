import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ContentCut from "@mui/icons-material/ContentCut";
import ContentCopy from "@mui/icons-material/ContentCopy";
import ContentPaste from "@mui/icons-material/ContentPaste";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import Cloud from "@mui/icons-material/Cloud";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Tooltip from "@mui/material/Tooltip";
import AddCardIcon from "@mui/icons-material/AddCard";
import Button from "@mui/material/Button";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import Box from "@mui/material/Box";
import ListCards from "src/pages/Boards/BoardContent/ListColumns/Column/ListCards/ListCards";
import type { Card, Column as ColumnType } from "src/types/board.type";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CloseIcon from "@mui/icons-material/Close";
import TextField from "@mui/material/TextField";
import { toast } from "react-toastify";
import { useConfirm } from "material-ui-confirm";
import { cloneDeep } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "src/redux/store";
import { selectCurrentActiveBoard, updateCurrentActiveBoard } from "src/redux/activeBoard/activeBoardSlice";
import { createNewCardAPI, deleteColumnDetailsAPI } from "src/apis";

function Column({ column }: { column: ColumnType }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column._id,
    data: {
      ...column,
    },
  });
  const board = useSelector(selectCurrentActiveBoard);
  const dispatch = useDispatch<AppDispatch>();

  const dndKitColumnStyles = {
    transform: CSS.Translate.toString(transform),
    transition,
    height: "100%",
    opacity: isDragging ? 0.5 : undefined,
  };

  const [anchorEl, setAnchorEl] = useState<HTMLElement | SVGSVGElement | null>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const orderedCards = column.cards;

  const [openNewCardForm, setOpenNewCardForm] = useState(false);
  const toggleOpenNewCardForm = () => setOpenNewCardForm(!openNewCardForm);

  const [newCardTitle, setNewCardTitle] = useState("");

  const addNewCard = async () => {
    if (!newCardTitle) {
      toast.error("Card title cannot be empty", {
        position: "bottom-right",
      });
      return;
    }

    const newCardData: Partial<Card> = {
      title: newCardTitle,
      columnId: column._id,
    };

    if (!board) return;
    const createdCard = await createNewCardAPI({
      ...newCardData,
      boardId: board._id,
    });

    const newBoard = cloneDeep(board);
    const columnToUpdate = newBoard.columns.find((col) => col._id === createdCard.columnId);
    if (columnToUpdate) {
      if (columnToUpdate.cards.some((card) => card.FE_PlaceholderCard)) {
        columnToUpdate.cards = [createdCard];
        columnToUpdate.cardOrderIds = [createdCard._id];
      } else {
        columnToUpdate.cards.push(createdCard);
        columnToUpdate.cardOrderIds.push(createdCard._id);
      }
    }

    dispatch(updateCurrentActiveBoard(newBoard));

    toggleOpenNewCardForm();
    setNewCardTitle("");
  };

  const confirmDeleteColumn = useConfirm();
  const handleDeleteColumn = () => {
    confirmDeleteColumn({
      title: "Delete Column?",
      description: "This action will permanently delete your Column and its Cards! Are you sure?",
      confirmationText: "Confirm",
      cancellationText: "Cancel",
    })
      .then(() => {
        if (!board) return;
        const newBoard = { ...board };
        newBoard.columns = newBoard.columns.filter((col) => col._id !== column._id);
        newBoard.columnOrderIds = newBoard.columnOrderIds.filter((_id) => _id !== column._id);
        dispatch(updateCurrentActiveBoard(newBoard));

        deleteColumnDetailsAPI(column._id).then((res) => {
          toast.success(res?.deleteResult);
        });
      })
      .catch(() => {});
  };

  return (
    <div ref={setNodeRef} style={dndKitColumnStyles} {...attributes}>
      <Box
        {...listeners}
        sx={{
          minWidth: "300px",
          maxWidth: "300px",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#333643" : "#ebecf0"),
          ml: 2,
          borderRadius: "6px",
          height: "fit-content",
          maxHeight: (theme) => `calc(${theme.trellify.boardContentHeight} - ${theme.spacing(5)})`,
        }}
      >
        {/* Box Column Header */}
        <Box
          sx={{
            height: (theme) => theme.trellify.columnHeaderHeight,
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant='h6'
            sx={{
              fontSize: "1rem",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {column?.title}
          </Typography>
          <Box>
            <Tooltip title='More options'>
              <ExpandMoreIcon
                sx={{
                  color: "text.primary",
                  cursor: "pointer",
                }}
                id='basic-column-dropdown'
                aria-controls={open ? "basic-menu-column-dropdown" : undefined}
                aria-haspopup='true'
                aria-expanded={open ? "true" : undefined}
                onClick={handleClick}
              />
            </Tooltip>
            <Menu
              id='basic-menu-column-dropdown'
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              onClick={handleClose}
              slotProps={{
                list: {
                  "aria-labelledby": "basic-column-dropdown",
                },
              }}
            >
              <MenuItem
                onClick={toggleOpenNewCardForm}
                sx={{
                  "&:hover": {
                    color: "success.light",
                    "& .add-card-icon": { color: "success.light" },
                  },
                }}
              >
                <ListItemIcon>
                  <AddCardIcon fontSize='small' />
                </ListItemIcon>
                <ListItemText>Add new card</ListItemText>
              </MenuItem>
              <MenuItem>
                <ListItemIcon>
                  <ContentCut fontSize='small' />
                </ListItemIcon>
                <ListItemText>Cut</ListItemText>
              </MenuItem>
              <MenuItem>
                <ListItemIcon>
                  <ContentCopy fontSize='small' />
                </ListItemIcon>
                <ListItemText>Copy</ListItemText>
              </MenuItem>
              <MenuItem>
                <ListItemIcon>
                  <ContentPaste fontSize='small' />
                </ListItemIcon>
                <ListItemText>Paste</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={handleDeleteColumn}
                sx={{
                  "&:hover": {
                    color: "warning.dark",
                    "& .delete-forever-icon": { color: "warning.dark" },
                  },
                }}
              >
                <ListItemIcon>
                  <DeleteForeverIcon fontSize='small' />
                </ListItemIcon>
                <ListItemText>Delete this column</ListItemText>
              </MenuItem>
              <MenuItem>
                <ListItemIcon>
                  <Cloud fontSize='small' />
                </ListItemIcon>
                <ListItemText>Archive this column</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* List Card */}
        <ListCards cards={orderedCards} />

        {/* Box Column Footer */}
        <Box
          sx={{
            height: (theme) => theme.trellify.columnFooterHeight,
            p: 2,
          }}
        >
          {!openNewCardForm ? (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Button startIcon={<AddCardIcon />} onClick={toggleOpenNewCardForm}>
                Add new card
              </Button>
              <Tooltip title='Drag to move'>
                <DragHandleIcon sx={{ cursor: "pointer" }} />
              </Tooltip>
            </Box>
          ) : (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <TextField
                label='Enter card title...'
                type='text'
                size='small'
                variant='outlined'
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                data-no-dnd='true'
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                sx={{
                  "& label": { color: "text.primary" },
                  "& input": {
                    color: (theme) => theme.palette.primary.main,
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? "#333643" : "white"),
                  },
                  "& label.Mui-focused": { color: (theme) => theme.palette.primary.main },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: (theme) => theme.palette.primary.main },
                    "&:hover fieldset": { borderColor: (theme) => theme.palette.primary.main },
                    "&.Mui-focused fieldset": { borderColor: (theme) => theme.palette.primary.main },
                  },
                  "& .MuiOutlinedInput-input": {
                    borderRadius: 1,
                  },
                }}
              />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  onClick={addNewCard}
                  variant='contained'
                  color='success'
                  size='small'
                  sx={{
                    boxShadow: "none",
                    border: "0.5px solid",
                    borderColor: (theme) => theme.palette.success.main,
                    "&:hover": { bgcolor: (theme) => theme.palette.success.main },
                  }}
                >
                  Add
                </Button>
                <CloseIcon
                  fontSize='small'
                  sx={{
                    color: (theme) => theme.palette.warning.light,
                    cursor: "pointer",
                  }}
                  onClick={toggleOpenNewCardForm}
                />
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </div>
  );
}
export default Column;

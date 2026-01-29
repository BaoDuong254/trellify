import Column from "src/pages/Boards/BoardContent/ListColumns/Column/Column";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import type { Column as ColumnType } from "src/types/board.type";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";
import TextField from "@mui/material/TextField";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import { createNewColumnAPI } from "src/apis";
import { generatePlaceholderCard } from "src/utils/formatters";
import { cloneDeep } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import { selectCurrentActiveBoard, updateCurrentActiveBoard } from "src/redux/activeBoard/activeBoardSlice";
import type { AppDispatch } from "src/redux/store";

function ListColumns({ columns }: { columns: ColumnType[] }) {
  const [openNewColumnForm, setOpenNewColumnForm] = useState(false);
  const board = useSelector(selectCurrentActiveBoard);
  const dispatch = useDispatch<AppDispatch>();

  const toggleOpenNewColumnForm = () => {
    setOpenNewColumnForm((prev) => !prev);
  };
  const [newColumnTitle, setNewColumnTitle] = useState("");

  const addNewColumn = async () => {
    if (!newColumnTitle) {
      toast.error("Column title cannot be empty");
      return;
    }

    const newColumnData = {
      title: newColumnTitle,
    };

    if (!board) return;

    const createdColumn = await createNewColumnAPI({
      ...newColumnData,
      boardId: board._id,
    });

    const placeholderCard = generatePlaceholderCard(createdColumn);
    createdColumn.cards = [placeholderCard];
    createdColumn.cardOrderIds = [placeholderCard._id];

    const newBoard = cloneDeep(board);
    newBoard.columns.push(createdColumn);
    newBoard.columnOrderIds.push(createdColumn._id);

    dispatch(updateCurrentActiveBoard(newBoard));

    toggleOpenNewColumnForm();
    setNewColumnTitle("");
  };
  return (
    <SortableContext items={columns.map((column) => column._id)} strategy={horizontalListSortingStrategy}>
      <Box
        sx={{
          bgcolor: "inherit",
          width: "100%",
          height: "100%",
          display: "flex",
          overflowX: "auto",
          overflowY: "hidden",
          "&::-webkit-scrollbar-track": {
            m: 2,
          },
        }}
      >
        {columns?.map((column) => (
          <Column key={column._id} column={column} />
        ))}
        {!openNewColumnForm ? (
          <Box
            onClick={toggleOpenNewColumnForm}
            sx={{
              minWidth: "200px",
              maxWidth: "200px",
              mx: 2,
              borderRadius: "6px",
              height: "fit-content",
              bgcolor: "#ffffff3d",
            }}
          >
            <Button
              startIcon={<NoteAddIcon />}
              sx={{
                color: "white",
                width: "100%",
                justifyContent: "flex-start",
                pl: 2.5,
                py: 1,
              }}
            >
              Add new column
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              minWidth: "250px",
              maxWidth: "250px",
              mx: 2,
              p: 1,
              borderRadius: "6px",
              height: "fit-content",
              bgcolor: "#ffffff3d",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <TextField
              label='Enter column title...'
              type='text'
              size='small'
              variant='outlined'
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addNewColumn();
                }
              }}
              sx={{
                "& label": { color: "white" },
                "& input": { color: "white" },
                "& label.Mui-focused": { color: "white" },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "white" },
                  "&:hover fieldset": { borderColor: "white" },
                  "&.Mui-focused fieldset": { borderColor: "white" },
                },
              }}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Button
                className='interceptor-loading'
                onClick={addNewColumn}
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
                Add Column
              </Button>
              <CloseIcon
                fontSize='small'
                sx={{
                  color: "white",
                  cursor: "pointer",
                  "&:hover": { color: (theme) => theme.palette.warning.light },
                }}
                onClick={toggleOpenNewColumnForm}
              />
            </Box>
          </Box>
        )}
      </Box>
    </SortableContext>
  );
}
export default ListColumns;

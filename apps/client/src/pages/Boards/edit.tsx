import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { useForm } from "react-hook-form";

import { updateBoardDetailsAPI } from "src/apis";
import FieldErrorAlert from "src/components/Form/FieldErrorAlert";
import type { Board } from "src/types/board.type";
import { FIELD_REQUIRED_MESSAGE } from "src/utils/validators";

interface EditBoardFormData {
  title: string;
  description: string;
}

function EditBoardModal({
  board,
  onClose,
  afterUpdateBoard,
}: {
  board: Board;
  onClose: () => void;
  afterUpdateBoard: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditBoardFormData>({
    defaultValues: { title: board.title, description: board.description },
  });

  const submitUpdateBoard = (data: EditBoardFormData) => {
    updateBoardDetailsAPI(board._id, data).then(() => {
      onClose();
      afterUpdateBoard();
    });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='sm'>
      <form onSubmit={handleSubmit(submitUpdateBoard)}>
        <DialogTitle>Edit board</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            fullWidth
            label='Title'
            variant='outlined'
            sx={{ mt: 1 }}
            {...register("title", {
              required: FIELD_REQUIRED_MESSAGE,
              minLength: { value: 3, message: "Min Length is 3 characters" },
              maxLength: { value: 50, message: "Max Length is 50 characters" },
            })}
            error={!!errors["title"]}
          />
          <FieldErrorAlert errors={errors} fieldName={"title"} />
          <TextField
            fullWidth
            label='Description'
            variant='outlined'
            multiline
            minRows={3}
            {...register("description", {
              required: FIELD_REQUIRED_MESSAGE,
              minLength: { value: 3, message: "Min Length is 3 characters" },
              maxLength: { value: 256, message: "Max Length is 256 characters" },
            })}
            error={!!errors["description"]}
          />
          <FieldErrorAlert errors={errors} fieldName={"description"} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button className='interceptor-loading' type='submit' variant='contained'>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default EditBoardModal;

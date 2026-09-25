import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import type { ChecklistItemType } from "@workspace/shared/schemas/card.schema";

function CardChecklistSection({
  checklist,
  onChange,
}: {
  checklist: ChecklistItemType[];
  onChange: (checklist: ChecklistItemType[]) => void;
}) {
  const doneCount = checklist.filter((item) => item.done).length;
  const progress = checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0;

  const addItem = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    const text = target.value.trim();
    if (!text) return;
    onChange([...checklist, { _id: crypto.randomUUID(), text, done: false }]);
    target.value = "";
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
        <TaskAltOutlinedIcon />
        <Typography component='span' sx={{ fontWeight: "600", fontSize: "20px" }}>
          Checklist
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography sx={{ fontSize: "12px", width: 36 }}>{progress}%</Typography>
        <LinearProgress
          variant='determinate'
          value={progress}
          color={progress === 100 ? "success" : "primary"}
          sx={{ flex: 1, height: 8, borderRadius: 4 }}
        />
      </Box>
      {checklist.map((item) => (
        <Box key={item._id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Checkbox
            size='small'
            checked={item.done}
            onChange={() =>
              onChange(checklist.map((entry) => (entry._id === item._id ? { ...entry, done: !entry.done } : entry)))
            }
            slotProps={{ input: { "aria-label": item.text } }}
          />
          <Typography sx={{ flex: 1, textDecoration: item.done ? "line-through" : "none", wordBreak: "break-word" }}>
            {item.text}
          </Typography>
          <IconButton
            size='small'
            aria-label='Delete item'
            onClick={() => onChange(checklist.filter((entry) => entry._id !== item._id))}
          >
            <DeleteOutlinedIcon fontSize='small' />
          </IconButton>
        </Box>
      ))}
      <TextField
        fullWidth
        size='small'
        placeholder='Add an item...'
        onKeyDown={addItem}
        slotProps={{ htmlInput: { maxLength: 200 } }}
        sx={{ mt: 1 }}
      />
    </Box>
  );
}

export default CardChecklistSection;

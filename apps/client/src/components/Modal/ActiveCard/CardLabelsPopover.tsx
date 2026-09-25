import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import type { BoardLabelType } from "@workspace/shared/schemas/board.schema";

const LABEL_COLORS = ["#61bd4f", "#f2d600", "#ff9f1a", "#eb5a46", "#c377e0", "#0079bf", "#00c2e0", "#344563"];

function CardLabelsPopover({
  anchorEl,
  onClose,
  boardLabels,
  selectedLabelIds,
  onToggleLabel,
  onBoardLabelsChange,
}: {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  boardLabels: BoardLabelType[];
  selectedLabelIds: string[];
  onToggleLabel: (labelId: string) => void;
  onBoardLabelsChange: (labels: BoardLabelType[]) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[0] as string);

  const createLabel = () => {
    onBoardLabelsChange([...boardLabels, { _id: crypto.randomUUID(), name: name.trim(), color }]);
    setName("");
  };

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
    >
      <Box sx={{ p: 2, width: 300, display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography sx={{ fontWeight: 600 }}>Labels</Typography>

        {boardLabels.map((label) => (
          <Box key={label._id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Checkbox
              size='small'
              checked={selectedLabelIds.includes(label._id)}
              onChange={() => onToggleLabel(label._id)}
              slotProps={{ input: { "aria-label": label.name || label.color } }}
            />
            <Box sx={{ flex: 1, bgcolor: label.color, color: "#fff", borderRadius: 1, px: 1, py: 0.5, minHeight: 28 }}>
              {label.name}
            </Box>
            <IconButton
              size='small'
              aria-label='Delete label'
              onClick={() => onBoardLabelsChange(boardLabels.filter((item) => item._id !== label._id))}
            >
              <CloseIcon fontSize='small' />
            </IconButton>
          </Box>
        ))}

        <Typography sx={{ fontWeight: 600, mt: 1 }}>Create a label</Typography>
        <TextField
          size='small'
          placeholder='Label name'
          value={name}
          onChange={(event) => setName(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 30 } }}
        />
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {LABEL_COLORS.map((swatch) => (
            <Box
              key={swatch}
              component='button'
              type='button'
              aria-label={`Color ${swatch}`}
              onClick={() => setColor(swatch)}
              sx={{
                width: 28,
                height: 24,
                bgcolor: swatch,
                borderRadius: 1,
                cursor: "pointer",
                border: color === swatch ? "2px solid" : "2px solid transparent",
                borderColor: color === swatch ? "text.primary" : "transparent",
              }}
            />
          ))}
        </Box>
        <Button variant='contained' size='small' onClick={createLabel}>
          Create
        </Button>
      </Box>
    </Popover>
  );
}

export default CardLabelsPopover;

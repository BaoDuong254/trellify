import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import { toDateTimeLocalValue } from "src/utils/formatters";

function CardDatesPopover({
  anchorEl,
  onClose,
  dueDate,
  onSave,
}: {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  dueDate?: string | null;
  onSave: (dueDate: string | null) => void;
}) {
  const [value, setValue] = useState(() => toDateTimeLocalValue(dueDate));

  const save = (nextDueDate: string | null) => {
    onSave(nextDueDate);
    onClose();
  };

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
    >
      <Box sx={{ p: 2, width: 280, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography sx={{ fontWeight: 600 }}>Due date</Typography>
        <TextField
          type='datetime-local'
          size='small'
          value={value}
          onChange={(event) => setValue(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant='contained'
            size='small'
            disabled={!value}
            onClick={() => save(new Date(value).toISOString())}
          >
            Save
          </Button>
          {dueDate && (
            <Button color='error' size='small' onClick={() => save(null)}>
              Remove
            </Button>
          )}
        </Box>
      </Box>
    </Popover>
  );
}

export default CardDatesPopover;

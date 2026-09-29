import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Popover from "@mui/material/Popover";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useDispatch, useSelector } from "react-redux";

import { selectCardFilter, setCardFilter } from "src/redux/activeBoard/activeBoardSlice";
import type { AppDispatch } from "src/redux/store";
import type { Board } from "src/types/board.type";
import { type CardFilter, type DueFilter, EMPTY_CARD_FILTER } from "src/utils/cardFilter";
import { cloudinaryThumb } from "src/utils/formatters";

const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: "overdue", label: "Overdue" },
  { value: "dueSoon", label: "Due in the next day" },
  { value: "upcoming", label: "Due later" },
  { value: "complete", label: "Marked as complete" },
  { value: "none", label: "No due date" },
];

const toggle = (ids: string[], id: string): string[] =>
  ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];

function BoardFilterPopover({
  anchorEl,
  onClose,
  board,
}: {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  board?: Board;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const filter = useSelector(selectCardFilter);

  const update = (patch: Partial<CardFilter>) => dispatch(setCardFilter({ ...filter, ...patch }));

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
    >
      <Box sx={{ p: 2, width: 300, maxHeight: 520, display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography sx={{ fontWeight: 600 }}>Filter cards</Typography>
        <TextField
          size='small'
          placeholder='Search card titles...'
          value={filter.keyword}
          onChange={(event) => update({ keyword: event.target.value })}
        />

        {(board?.labels.length ?? 0) > 0 && (
          <>
            <Typography sx={{ fontWeight: 600, mt: 1 }}>Labels</Typography>
            {board?.labels.map((label) => (
              <FormControlLabel
                key={label._id}
                control={
                  <Checkbox
                    size='small'
                    checked={filter.labelIds.includes(label._id)}
                    onChange={() => update({ labelIds: toggle(filter.labelIds, label._id) })}
                  />
                }
                label={
                  <Box sx={{ bgcolor: label.color, color: "#fff", borderRadius: 1, px: 1, minWidth: 80 }}>
                    {label.name || " "}
                  </Box>
                }
              />
            ))}
          </>
        )}

        <Typography sx={{ fontWeight: 600, mt: 1 }}>Members</Typography>
        {board?.FE_allUsers.map((user) => (
          <FormControlLabel
            key={user._id}
            control={
              <Checkbox
                size='small'
                checked={filter.memberIds.includes(user._id)}
                onChange={() => update({ memberIds: toggle(filter.memberIds, user._id) })}
              />
            }
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Avatar sx={{ width: 24, height: 24 }} src={cloudinaryThumb(user.avatar, 24)} alt={user.displayName} />
                {user.displayName}
              </Box>
            }
          />
        ))}

        <Typography sx={{ fontWeight: 600, mt: 1 }}>Due date</Typography>
        <RadioGroup
          value={filter.due ?? ""}
          onChange={(event) =>
            update({ due: DUE_OPTIONS.find((option) => option.value === event.target.value)?.value ?? null })
          }
        >
          {DUE_OPTIONS.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={<Radio size='small' />}
              label={option.label}
            />
          ))}
        </RadioGroup>

        <Button size='small' onClick={() => dispatch(setCardFilter(EMPTY_CARD_FILTER))}>
          Clear filters
        </Button>
      </Box>
    </Popover>
  );
}

export default BoardFilterPopover;

import TextField from "@mui/material/TextField";
import { useState } from "react";

function ToggleFocusInput({
  value,
  onChangedValue,
  inputLabel,
  inputFontSize = "16px",
  ...props
}: {
  value: string;
  onChangedValue: (newValue: string) => Promise<unknown>;
  inputLabel: string;
  inputFontSize?: string;
}) {
  const [inputValue, setInputValue] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const [focusValue, setFocusValue] = useState<string | null>(null);

  if (focusValue === null && value !== syncedValue) {
    setSyncedValue(value);
    setInputValue(value);
  }

  const triggerBlur = () => {
    const isUnchangedByUser = inputValue === focusValue;
    setFocusValue(null);
    setSyncedValue(value);
    const trimmedValue = inputValue.trim();

    if (isUnchangedByUser || !trimmedValue || trimmedValue === value) {
      setInputValue(value);
      return;
    }

    setInputValue(trimmedValue);
    onChangedValue(trimmedValue).catch(() => setInputValue(value));
  };

  return (
    <TextField
      fullWidth
      variant='outlined'
      size='small'
      value={inputValue}
      onChange={(event) => {
        setInputValue(event.target.value);
      }}
      onFocus={() => setFocusValue(inputValue)}
      onBlur={triggerBlur}
      slotProps={{ htmlInput: { "aria-label": inputLabel } }}
      {...props}
      sx={{
        "& label": {},
        "& input": { fontSize: inputFontSize, fontWeight: "bold" },
        "& .MuiOutlinedInput-root": {
          backgroundColor: "transparent",
          "& fieldset": { borderColor: "transparent" },
        },
        "& .MuiOutlinedInput-root:hover": {
          borderColor: "transparent",
          "& fieldset": { borderColor: "transparent" },
        },
        "& .MuiOutlinedInput-root.Mui-focused": {
          backgroundColor: (theme) => (theme.palette.mode === "dark" ? "#33485D" : "white"),
          "& fieldset": { borderColor: "primary.main" },
        },
        "& .MuiOutlinedInput-input": {
          px: "6px",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        },
      }}
    />
  );
}

export default ToggleFocusInput;

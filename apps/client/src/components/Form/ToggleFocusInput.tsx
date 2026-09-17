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
  onChangedValue: (newValue: string) => void;
  inputLabel: string;
  inputFontSize?: string;
}) {
  const [inputValue, setInputValue] = useState(value);

  const triggerBlur = () => {
    setInputValue(inputValue.trim());

    if (!inputValue || inputValue.trim() === value) {
      setInputValue(value);
      return;
    }

    onChangedValue(inputValue);
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

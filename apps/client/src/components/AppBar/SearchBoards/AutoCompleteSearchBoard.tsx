/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import { createSearchParams, useNavigate } from "react-router-dom";

function AutoCompleteSearchBoard() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setBoards(null);
    }
  }, [open]);

  const handleInputSearchChange = (event) => {
    const searchValue = event.target?.value;
    if (!searchValue) return;

    const searchPath = `?${createSearchParams({ "q[title]": searchValue })}`;
  };

  const handleSelectedBoard = (event, selectedBoard) => {};

  return (
    <Autocomplete
      sx={{ width: 220 }}
      id='asynchronous-search-board'
      noOptionsText={!boards ? "Type to search board..." : "No board found!"}
      open={open}
      onOpen={() => {
        setOpen(true);
      }}
      onClose={() => {
        setOpen(false);
      }}
      getOptionLabel={(board) => board.title}
      options={boards || []}
      isOptionEqualToValue={(option, value) => option._id === value._id}
      loading={loading}
      onInputChange={handleInputSearchChange}
      onChange={handleSelectedBoard}
      renderInput={(params) => (
        <TextField
          {...params}
          label='Type to search...'
          size='small'
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position='start'>
                  <SearchIcon sx={{ color: "white" }} />
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  {loading ? <CircularProgress sx={{ color: "white" }} size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
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
            ".MuiSvgIcon-root": { color: "white" },
          }}
        />
      )}
    />
  );
}

export default AutoCompleteSearchBoard;

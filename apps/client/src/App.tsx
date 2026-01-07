import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import { useColorScheme } from "@mui/material/styles";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";

function ModeSelect() {
  const { mode, setMode } = useColorScheme();

  const handleChange = (event: SelectChangeEvent) => {
    setMode(event.target.value as "light" | "dark" | "system");
  };

  return (
    <FormControl sx={{ m: 1, minWidth: 120 }} size='small'>
      <InputLabel id='label-select-dark-light-mode'>
        {mode === "light" ? "Light" : mode === "dark" ? "Dark" : "System"}
      </InputLabel>
      <Select
        labelId='label-select-dark-light-mode'
        id='select-dark-light-mode'
        value={mode}
        label='Mode'
        onChange={handleChange}>
        <MenuItem value='light'>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LightModeIcon fontSize='small' />
            Light
          </Box>
        </MenuItem>
        <MenuItem value='dark'>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DarkModeOutlinedIcon fontSize='small' />
            Dark
          </Box>
        </MenuItem>
        <MenuItem value='system'>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SettingsBrightnessIcon fontSize='small' />
            System
          </Box>
        </MenuItem>
      </Select>
    </FormControl>
  );
}

export default function App() {
  return (
    <Container sx={{ height: "100vh", backgroundColor: "primary.main" }} disableGutters maxWidth={false}>
      <Box
        sx={{
          backgroundColor: "primary.light",
          width: "100%",
          height: (theme) => theme.trellify.appBarHeight,
          display: "flex",
          alignItems: "center",
        }}>
        <ModeSelect />
      </Box>
      <Box
        sx={{
          backgroundColor: "primary.dark",
          width: "100%",
          height: (theme) => theme.trellify.boardBarHeight,
          display: "flex",
          alignItems: "center",
        }}>
        Board Bar
      </Box>
      <Box
        sx={{
          backgroundColor: "primary.main",
          width: "100%",
          height: (theme) => `calc(100vh - ${theme.trellify.appBarHeight + theme.trellify.boardBarHeight}px)`,
          display: "flex",
          alignItems: "center",
        }}>
        Board Content
      </Box>
    </Container>
  );
}

import ModeSelect from "@/components/ModeSelect";
import Box from "@mui/material/Box";
import AppsIcon from "@mui/icons-material/Apps";
import TrelloIcon from "@/assets/trello.svg?react";
import SvgIcon from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";
import Workspaces from "@/components/AppBar/Menus/Workspaces";
import Recent from "@/components/AppBar/Menus/Recent";
import Starred from "@/components/AppBar/Menus/Starred";
import Templates from "@/components/AppBar/Menus/Templates";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Badge from "@mui/material/Badge";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import Tooltip from "@mui/material/Tooltip";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import Profiles from "@/components/AppBar/Menus/Profiles";

function AppBar() {
  return (
    <Box
      px={2}
      sx={{
        backgroundColor: "primary.50",
        width: "100%",
        height: (theme) => theme.trellify.appBarHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <AppsIcon
          sx={{
            color: "primary.main",
          }}
        />
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <SvgIcon
            component={TrelloIcon}
            inheritViewBox
            sx={{
              color: "primary.main",
            }}
            fontSize='small'
          />
          <Typography
            variant='body1'
            component='span'
            sx={{ fontSize: "1.2rem", fontWeight: "bold", color: "primary.main" }}
          >
            Trellify
          </Typography>
        </Box>
        <Workspaces />
        <Recent />
        <Starred />
        <Templates />

        <Button variant='outlined'>Create</Button>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <TextField id='outlined-search' label='Search...' type='search' size='small' />
        <ModeSelect />
        <Tooltip title='Notifications'>
          <Badge
            color='secondary'
            variant='dot'
            sx={{
              cursor: "pointer",
            }}
          >
            <NotificationsNoneIcon sx={{ color: "primary.main" }} />
          </Badge>
        </Tooltip>
        <Tooltip title='Help'>
          <HelpOutlineIcon
            sx={{
              cursor: "pointer",
              color: "primary.main",
            }}
          />
        </Tooltip>
        <Profiles />
      </Box>
    </Box>
  );
}
export default AppBar;

import Logout from "@mui/icons-material/Logout";
import PersonAdd from "@mui/icons-material/PersonAdd";
import Settings from "@mui/icons-material/Settings";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import { useConfirm } from "material-ui-confirm";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

import type { AppDispatch } from "src/redux/store";
import { logoutUserAPI, selectCurrentUser } from "src/redux/user/userSlice";

function Profiles() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector(selectCurrentUser);

  const confirmLogout = useConfirm();
  const handleLogout = () => {
    confirmLogout({
      title: "Log out of your account?",
      description: "Are you sure you want to log out? You can always log back in later.",
      confirmationText: "Confirm",
      cancellationText: "Cancel",
    })
      .then(({ confirmed }) => {
        if (confirmed) {
          dispatch(logoutUserAPI(true));
        }
      })
      .catch(() => {});
  };
  return (
    <Box>
      <Tooltip title='Account settings'>
        <IconButton
          onClick={handleClick}
          size='small'
          sx={{ padding: 0 }}
          aria-controls={open ? "basic-menu-profiles" : undefined}
          aria-haspopup='true'
          aria-expanded={open ? "true" : undefined}
        >
          <Avatar sx={{ width: 36, height: 36 }} src={currentUser?.avatar ?? undefined} alt='User avatar' />
        </IconButton>
      </Tooltip>
      <Menu
        id='basic-menu-profiles'
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          list: {
            "aria-labelledby": "basic-button-profiles",
          },
        }}
      >
        <Link to='/settings/account' style={{ color: "inherit" }}>
          <MenuItem sx={{ "&:hover": { color: "success.light" } }}>
            <Avatar sx={{ width: 28, height: 28, mr: 2 }} src={currentUser?.avatar ?? undefined} /> Profile
          </MenuItem>
        </Link>
        <Divider />
        <MenuItem>
          <ListItemIcon>
            <PersonAdd fontSize='small' />
          </ListItemIcon>
          Add another account
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <Settings fontSize='small' />
          </ListItemIcon>
          Settings
        </MenuItem>
        <MenuItem
          onClick={handleLogout}
          sx={{
            "&:hover": {
              color: "warning.dark",
              "& .logout-icon": { color: "warning.dark" },
            },
          }}
        >
          <ListItemIcon>
            <Logout className='logout-icon' fontSize='small' />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
}
export default Profiles;

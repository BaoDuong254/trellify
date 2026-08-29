import Box from "@mui/material/Box";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

import { useAuthShell } from "src/hooks/useAuthShell";
import { authPageSx } from "src/pages/Auth/authLayout";
import { selectCurrentUser } from "src/redux/user/userSlice";

function AuthLayout() {
  useAuthShell();

  const currentUser = useSelector(selectCurrentUser);
  if (currentUser) {
    return <Navigate to='/' replace />;
  }

  return (
    <Box component='main' sx={authPageSx}>
      <Outlet />
    </Box>
  );
}

export default AuthLayout;

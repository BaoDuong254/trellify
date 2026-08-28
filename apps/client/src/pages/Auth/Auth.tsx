import Box from "@mui/material/Box";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

import ForgotPasswordForm from "src/pages/Auth/ForgotPasswordForm";
import LoginForm from "src/pages/Auth/LoginForm";
import RegisterForm from "src/pages/Auth/RegisterForm";
import { authPageSx } from "src/pages/Auth/authLayout";
import { selectCurrentUser } from "src/redux/user/userSlice";

function Auth() {
  const location = useLocation();
  const isLogin = location.pathname === "/login";
  const isRegister = location.pathname === "/register";
  const isForgotPassword = location.pathname === "/forgot-password";

  const currentUser = useSelector(selectCurrentUser);
  if (currentUser) {
    return <Navigate to='/' replace />;
  }

  return (
    <Box component='main' sx={authPageSx}>
      {isLogin && <LoginForm />}
      {isRegister && <RegisterForm />}
      {isForgotPassword && <ForgotPasswordForm />}
    </Box>
  );
}

export default Auth;

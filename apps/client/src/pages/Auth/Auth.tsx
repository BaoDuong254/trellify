import Box from "@mui/material/Box";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

import loginBgImage from "src/assets/auth/login-register-bg.jpg";
import ForgotPasswordForm from "src/pages/Auth/ForgotPasswordForm";
import LoginForm from "src/pages/Auth/LoginForm";
import RegisterForm from "src/pages/Auth/RegisterForm";
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "flex-start",
        background: `url(${loginBgImage})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
        boxShadow: "inset 0 0 0 2000px rgba(0, 0, 0, 0.2)",
      }}
    >
      {isLogin && <LoginForm />}
      {isRegister && <RegisterForm />}
      {isForgotPassword && <ForgotPasswordForm />}
    </Box>
  );
}

export default Auth;

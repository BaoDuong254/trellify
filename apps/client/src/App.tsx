import { Suspense, lazy } from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import PageLoadingSpinner from "src/components/Loading/PageLoadingSpinner";
import { useSocketConnection } from "src/hooks/useSocketConnection";
import AuthLayout from "src/layouts/AuthLayout";
import LoginForm from "src/pages/Auth/LoginForm";
import { selectCurrentUser } from "src/redux/user/userSlice";
import type { User } from "src/types/user.type";

// Lazy load page components
const NotFound = lazy(() => import("src/pages/NotFound/NotFound"));
const Board = lazy(() => import("src/pages/Boards/_id"));
const AccountVerification = lazy(() => import("src/pages/Auth/AccountVerification"));
const Settings = lazy(() => import("src/pages/Settings/Settings"));
const Boards = lazy(() => import("src/pages/Boards"));
const ResetPasswordForm = lazy(() => import("src/pages/Auth/ResetPasswordForm"));
const RegisterForm = lazy(() => import("src/pages/Auth/RegisterForm"));
const ForgotPasswordForm = lazy(() => import("src/pages/Auth/ForgotPasswordForm"));
const ConfirmLayout = lazy(() => import("src/layouts/ConfirmLayout"));

const ProtectedRoute = ({ user }: { user: User | null }) => {
  if (!user) return <Navigate to='/login' replace={true} />;
  return <Outlet />;
};

export default function App() {
  const currentUser = useSelector(selectCurrentUser);

  useSocketConnection();

  return (
    <Suspense fallback={<PageLoadingSpinner caption='Loading...' />}>
      <Routes>
        <Route path='/' element={<Navigate to='/boards' replace />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute user={currentUser} />}>
          <Route element={<ConfirmLayout />}>
            {/* Board Details */}
            <Route path='/boards/:boardId' element={<Board />} />
            <Route path='/boards' element={<Boards />} />

            {/* User Settings */}
            <Route path='/settings/account' element={<Settings />} />
            <Route path='/settings/security' element={<Settings />} />
          </Route>
        </Route>

        {/* Authentication */}
        <Route element={<AuthLayout />}>
          <Route path='/login' element={<LoginForm />} />
          <Route path='/register' element={<RegisterForm />} />
          <Route path='/forgot-password' element={<ForgotPasswordForm />} />
        </Route>
        <Route path='/reset-password' element={<ResetPasswordForm />} />
        <Route path='/account/verification' element={<AccountVerification />} />

        {/* 404 not found page */}
        <Route path='*' element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

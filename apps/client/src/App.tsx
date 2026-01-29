import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { selectCurrentUser } from "src/redux/user/userSlice";
import type { User } from "src/types/user.type";
import PageLoadingSpinner from "src/components/Loading/PageLoadingSpinner";
import { useSelector } from "react-redux";

// Lazy load page components
const NotFound = lazy(() => import("src/pages/NotFound/NotFound"));
const Board = lazy(() => import("src/pages/Boards/_id"));
const Auth = lazy(() => import("src/pages/Auth/Auth"));
const AccountVerification = lazy(() => import("src/pages/Auth/AccountVerification"));
const Settings = lazy(() => import("src/pages/Settings/Settings"));
const Boards = lazy(() => import("src/pages/Boards"));

const ProtectedRoute = ({ user }: { user: User | null }) => {
  if (!user) return <Navigate to='/login' replace={true} />;
  return <Outlet />;
};

export default function App() {
  const currentUser = useSelector(selectCurrentUser);

  return (
    <Suspense fallback={<PageLoadingSpinner caption='Loading...' />}>
      <Routes>
        <Route path='/' element={<Navigate to='/boards' replace />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute user={currentUser} />}>
          {/* Board Details */}
          <Route path='/boards/:boardId' element={<Board />} />
          <Route path='/boards' element={<Boards />} />

          {/* User Settings */}
          <Route path='/settings/account' element={<Settings />} />
          <Route path='/settings/security' element={<Settings />} />
        </Route>

        {/* Authentication */}
        <Route path='/login' element={<Auth />} />
        <Route path='/register' element={<Auth />} />
        <Route path='/account/verification' element={<AccountVerification />} />

        {/* 404 not found page */}
        <Route path='*' element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

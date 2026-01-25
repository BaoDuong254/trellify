import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import NotFound from "src/pages/NotFound/NotFound";
import Board from "src/pages/Boards/_id";
import Auth from "src/pages/Auth/Auth";
import AccountVerification from "src/pages/Auth/AccountVerification";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "src/redux/user/userSlice";
import type { User } from "src/types/user.type";
import Settings from "src/pages/Settings/Settings";
import Boards from "src/pages/Boards";

const ProtectedRoute = ({ user }: { user: User | null }) => {
  if (!user) return <Navigate to='/login' replace={true} />;
  return <Outlet />;
};

export default function App() {
  const currentUser = useSelector(selectCurrentUser);

  return (
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
  );
}

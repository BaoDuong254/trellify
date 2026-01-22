import { Navigate, Route, Routes } from "react-router-dom";
import NotFound from "src/pages/NotFound/NotFound";
import Board from "src/pages/Boards/_id";
import Auth from "src/pages/Auth/Auth";

export default function App() {
  return (
    <Routes>
      <Route path='/' element={<Navigate to='/board/696cf8e1464f12fbc4ad6c37' replace />} />
      <Route path='/board/:boardId' element={<Board />} />
      <Route path='/login' element={<Auth />} />
      <Route path='/register' element={<Auth />} />
      <Route path='*' element={<NotFound />} />
    </Routes>
  );
}

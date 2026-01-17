import axios from "axios";
import envConfig from "src/config/env";
import type { Board } from "src/types/board.type";

export const fetchBoardDetailsAPI = async (boardId: string): Promise<Board> => {
  const response = await axios.get(`${envConfig.VITE_API_ENDPOINT}/api/v1/boards/${boardId}`);
  return response.data.data;
};

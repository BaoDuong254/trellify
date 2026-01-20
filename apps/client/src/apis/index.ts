import axios from "axios";
import envConfig from "src/config/env";
import type { Board, Card, Column } from "src/types/board.type";

export const fetchBoardDetailsAPI = async (boardId: string): Promise<Board> => {
  const response = await axios.get(`${envConfig.VITE_API_ENDPOINT}/api/v1/boards/${boardId}`);
  return response.data.data;
};

export const createNewColumnAPI = async (newColumnData: Partial<Card>): Promise<Column> => {
  const response = await axios.post(`${envConfig.VITE_API_ENDPOINT}/api/v1/columns`, newColumnData);
  return response.data.data;
};

export const createNewCardAPI = async (newCardData: Partial<Card>): Promise<Card> => {
  const response = await axios.post(`${envConfig.VITE_API_ENDPOINT}/api/v1/cards`, newCardData);
  return response.data.data;
};

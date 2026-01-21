import type { MoveCardToDifferentColumnType, UpdateBoardType } from "@workspace/shared/schemas/board.schema";
import type { UpdateColumnType } from "@workspace/shared/schemas/column.schema";
import axios from "axios";
import envConfig from "src/config/env";
import type { Board, Card, Column } from "src/types/board.type";

// Board APIs
export const fetchBoardDetailsAPI = async (boardId: string): Promise<Board> => {
  const response = await axios.get(`${envConfig.VITE_API_ENDPOINT}/api/v1/boards/${boardId}`);
  return response.data.data;
};

export const updateBoardDetailsAPI = async (boardId: string, updateData: UpdateBoardType): Promise<Board> => {
  const response = await axios.put(`${envConfig.VITE_API_ENDPOINT}/api/v1/boards/${boardId}`, updateData);
  return response.data.data;
};

export const moveCardToDifferentColumnAPI = async (updateData: MoveCardToDifferentColumnType) => {
  const response = await axios.put(`${envConfig.VITE_API_ENDPOINT}/api/v1/boards/supports/moving_card`, updateData);
  return response.data.data;
};

// Column APIs
export const createNewColumnAPI = async (newColumnData: Partial<Column>): Promise<Column> => {
  const response = await axios.post(`${envConfig.VITE_API_ENDPOINT}/api/v1/columns`, newColumnData);
  return response.data.data;
};

export const updateColumnDetailsAPI = async (columnId: string, updateData: UpdateColumnType) => {
  const response = await axios.put(`${envConfig.VITE_API_ENDPOINT}/api/v1/columns/${columnId}`, updateData);
  return response.data.data;
};

// Card APIs
export const createNewCardAPI = async (newCardData: Partial<Card>): Promise<Card> => {
  const response = await axios.post(`${envConfig.VITE_API_ENDPOINT}/api/v1/cards`, newCardData);
  return response.data.data;
};

import type { MoveCardToDifferentColumnType, UpdateBoardType } from "@workspace/shared/schemas/board.schema";
import type { UpdateCardType } from "@workspace/shared/schemas/card.schema";
import type { UpdateColumnType } from "@workspace/shared/schemas/column.schema";
import { toast } from "react-toastify";
import envConfig from "src/config/env";
import type { CreateBoardFormData } from "src/pages/Boards/create";
import type { Board, Card, Column } from "src/types/board.type";
import http from "src/utils/http";

// Board APIs
export const fetchBoardDetailsAPI = async (boardId: string): Promise<Board> => {
  const response = await http.get(`${envConfig.VITE_API_ENDPOINT}/api/v1/boards/${boardId}`);
  return response.data.data;
};

export const updateBoardDetailsAPI = async (boardId: string, updateData: UpdateBoardType): Promise<Board> => {
  const response = await http.put(`${envConfig.VITE_API_ENDPOINT}/api/v1/boards/${boardId}`, updateData);
  return response.data.data;
};

export const moveCardToDifferentColumnAPI = async (updateData: MoveCardToDifferentColumnType) => {
  const response = await http.put(`${envConfig.VITE_API_ENDPOINT}/api/v1/boards/supports/moving_card`, updateData);
  return response.data.data;
};

export const fetchBoardsAPI = async (searchPath: string) => {
  const response = await http.get(`${envConfig.VITE_API_ENDPOINT}/api/v1/boards${searchPath}`);
  return response.data.data;
};

export const createNewBoardAPI = async (data: CreateBoardFormData) => {
  const response = await http.post(`${envConfig.VITE_API_ENDPOINT}/api/v1/boards`, data);
  toast.success("Board created successfully");
  return response.data.data;
};

// Column APIs
export const createNewColumnAPI = async (newColumnData: Partial<Column>): Promise<Column> => {
  const response = await http.post(`${envConfig.VITE_API_ENDPOINT}/api/v1/columns`, newColumnData);
  return response.data.data;
};

export const updateColumnDetailsAPI = async (columnId: string, updateData: UpdateColumnType) => {
  const response = await http.put(`${envConfig.VITE_API_ENDPOINT}/api/v1/columns/${columnId}`, updateData);
  return response.data.data;
};

export const deleteColumnDetailsAPI = async (columnId: string) => {
  const response = await http.delete(`${envConfig.VITE_API_ENDPOINT}/api/v1/columns/${columnId}`);
  return response.data.data;
};

// Card APIs
export const createNewCardAPI = async (newCardData: Partial<Card>): Promise<Card> => {
  const response = await http.post(`${envConfig.VITE_API_ENDPOINT}/api/v1/cards`, newCardData);
  return response.data.data;
};

export const updateCardDetailsAPI = async (cardId: string, updateData: UpdateCardType) => {
  const response = await http.put(`${envConfig.VITE_API_ENDPOINT}/api/v1/cards/${cardId}`, updateData);
  return response.data.data;
};

// User APIs
export const registerUserAPI = async (data: { email: string; password: string }) => {
  const response = await http.post(`${envConfig.VITE_API_ENDPOINT}/api/v1/users/register`, data);
  toast.success("Account created successfully! Please check and verify your account before logging in!", {
    theme: "colored",
  });
  return response.data.data;
};

export const verifyUserAPI = async (data: { email: string; token: string }) => {
  const response = await http.put(`${envConfig.VITE_API_ENDPOINT}/api/v1/users/verify`, data);
  toast.success("Account verified successfully! Now you can login to enjoy our services! Have a good day!", {
    theme: "colored",
  });
  return response.data.data;
};

export const refreshTokenAPI = async () => {
  const response = await http.get(`${envConfig.VITE_API_ENDPOINT}/api/v1/users/refresh_token`);
  return response.data.data;
};

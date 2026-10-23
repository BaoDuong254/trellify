import http from "k6/http";

import { API_URL, TURNSTILE_TOKEN } from "../config/env.js";
import { stepTag } from "../config/profiles.js";

const clientIp = () => {
  const iteration = typeof __ITER === "undefined" ? 0 : __ITER;
  return `10.${(__VU >> 8) & 255}.${__VU & 255}.${iteration & 255}`;
};

const params = (endpoint, group, extraTags) => ({
  headers: { "Content-Type": "application/json", "CF-Connecting-IP": clientIp() },
  tags: { endpoint, group, name: endpoint, ...stepTag(), ...extraTags },
});

export function status() {
  return http.get(`${API_URL}/status`, params("status", "probe"));
}

export function listBoards(page = 1, itemsPerPage = 12) {
  return http.get(`${API_URL}/boards?page=${page}&itemsPerPage=${itemsPerPage}`, params("boards_list", "read"));
}

export function getBoardDetails(boardId, boardSize = "small") {
  return http.get(`${API_URL}/boards/${boardId}`, params("board_details", "read", { board_size: boardSize }));
}

export function getMissingBoardDetails(boardId) {
  return http.get(`${API_URL}/boards/${boardId}`, params("board_details_missing", "penetration"));
}

export function createBoard(title, description) {
  return http.post(
    `${API_URL}/boards`,
    JSON.stringify({ title, description, type: "private" }),
    params("board_create", "write")
  );
}

export function updateBoard(boardId, body) {
  return http.put(`${API_URL}/boards/${boardId}`, JSON.stringify(body), params("board_update", "write"));
}

export function createColumn(boardId, title) {
  return http.post(`${API_URL}/columns`, JSON.stringify({ boardId, title }), params("column_create", "write"));
}

export function updateColumn(columnId, body) {
  return http.put(`${API_URL}/columns/${columnId}`, JSON.stringify(body), params("column_update", "write"));
}

export function deleteColumn(columnId) {
  return http.del(`${API_URL}/columns/${columnId}`, null, params("column_delete", "write"));
}

export function createCard(boardId, columnId, title) {
  return http.post(`${API_URL}/cards`, JSON.stringify({ boardId, columnId, title }), params("card_create", "write"));
}

export function updateCard(cardId, body) {
  return http.put(`${API_URL}/cards/${cardId}`, JSON.stringify(body), params("card_update", "write"));
}

export function deleteCard(cardId) {
  return http.del(`${API_URL}/cards/${cardId}`, null, params("card_delete", "write"));
}

export function moveCard(body) {
  return http.put(`${API_URL}/boards/supports/moving_card`, JSON.stringify(body), params("card_move", "write"));
}

export function login(email, password) {
  return http.post(
    `${API_URL}/users/login`,
    JSON.stringify({ email, password, turnstileToken: TURNSTILE_TOKEN }),
    params("login", "auth")
  );
}

export function refreshToken() {
  return http.get(`${API_URL}/users/refresh_token`, params("refresh_token", "auth"));
}

export function logout() {
  return http.del(`${API_URL}/users/logout`, null, params("logout", "auth"));
}

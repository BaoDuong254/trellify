import type { Board, Card, Column } from "src/types/board.type";
import type { User } from "src/types/user.type";

type PublicUser = Omit<User, "password" | "verifyToken">;

export const buildUser = (overrides: Partial<PublicUser> = {}): PublicUser => ({
  _id: "user-1",
  email: "user-1@trellify.test",
  username: "user-1",
  displayName: "User One",
  avatar: null,
  role: "client",
  isActive: true,
  verifyTokenExpiry: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: null,
  _destroy: false,
  ...overrides,
});

export const buildCard = (overrides: Partial<Card> = {}): Card => ({
  _id: "card-1",
  boardId: "board-1",
  columnId: "column-1",
  title: "Write tests",
  memberIds: [],
  comments: [],
  ...overrides,
});

export const buildColumn = (overrides: Partial<Column> = {}): Column => ({
  _id: "column-1",
  boardId: "board-1",
  title: "To do",
  cardOrderIds: [],
  cards: [],
  ...overrides,
});

export const buildBoard = (overrides: Partial<Board> = {}): Board => ({
  _id: "board-1",
  title: "Roadmap",
  slug: "roadmap",
  description: "Board used by client tests",
  type: "private",
  columnOrderIds: [],
  ownerIds: ["user-1"],
  memberIds: [],
  columns: [],
  owners: [],
  members: [],
  FE_allUsers: [],
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: null,
  _destroy: false,
  ...overrides,
});

export const BOARD_TYPES = {
  PUBLIC: "public",
  PRIVATE: "private",
};

export const DEFAULT_PAGE = 1;
export const DEFAULT_ITEMS_PER_PAGE = 12;

export const INVITATION_TYPES = {
  BOARD_INVITATION: "BOARD_INVITATION",
} as const;

export const BOARD_INVITATION_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
} as const;

export const CARD_MEMBER_ACTIONS = {
  ADD: "ADD",
  REMOVE: "REMOVE",
} as const;

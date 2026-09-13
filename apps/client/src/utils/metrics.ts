import * as Sentry from "@sentry/react";

export const recordBoardLoadTime = (durationMs: number): void => {
  Sentry.metrics.distribution("board.load_time", durationMs, { unit: "millisecond" });
};

export const recordCardMoved = (target: "same_column" | "other_column"): void => {
  Sentry.metrics.count("card.moved", 1, { attributes: { target } });
};

export const recordSocketReconnect = (): void => {
  Sentry.metrics.count("socket.reconnect", 1);
};

export const recordApiError = (status: number | undefined): void => {
  Sentry.metrics.count("api.error", 1, { attributes: { status: status === undefined ? "network" : String(status) } });
};

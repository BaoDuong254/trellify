import { setTimeout as delay } from "node:timers/promises";

import type { Request as ExpressRequest } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BOARD_UPDATE_REASONS, SOCKET_ID_HEADER, SOCKET_SERVER_EVENTS } from "@workspace/shared/utils/socket-events";

import { boardService } from "src/services/board.service";
import { broadcastBoardUpdate } from "src/sockets/board/board.broadcast";
import { hasOtherBoardViewers } from "src/sockets/board/board.viewers";
import { getIo } from "src/sockets/socket.server";
import type { AppServer } from "src/types/socket.type";

vi.mock("src/services/board.service", () => ({
  boardService: { getBoardSnapshot: vi.fn(), invalidateBoardCache: vi.fn(async () => {}) },
}));

vi.mock("src/sockets/board/board.viewers", () => ({
  hasOtherBoardViewers: vi.fn(),
  removeBoardViewer: vi.fn(),
}));

vi.mock("src/sockets/socket.server", () => ({ getIo: vi.fn() }));

const ACTOR_SOCKET = "actor-socket";

const createFakeIo = () => {
  const rooms = new Map<string, Set<string>>();
  const emit = vi.fn();
  const except = vi.fn(() => ({ emit }));
  const to = vi.fn(() => ({ except }));
  const io = { of: () => ({ adapter: { rooms } }), to } as unknown as AppServer;
  return { io, rooms, emit, except, to };
};

const requestFrom = (socketId?: string): ExpressRequest =>
  ({
    headers: socketId === undefined ? {} : { [SOCKET_ID_HEADER]: socketId },
    jwtDecoded: { _id: "user-1" },
  }) as unknown as ExpressRequest;

const settle = async (): Promise<void> => {
  await delay(0);
};

describe("broadcastBoardUpdate", () => {
  let fake: ReturnType<typeof createFakeIo>;

  beforeEach(() => {
    vi.clearAllMocks();
    fake = createFakeIo();
    vi.mocked(getIo).mockReturnValue(fake.io);
    vi.mocked(hasOtherBoardViewers).mockResolvedValue(true);
  });

  it("emits updates for one board in the order they were requested, even when the first snapshot is slower", async () => {
    vi.mocked(boardService.getBoardSnapshot)
      .mockImplementationOnce(async () => {
        await delay(30);
        return { version: 1 };
      })
      .mockImplementationOnce(async () => ({ version: 2 }));

    broadcastBoardUpdate(requestFrom(ACTOR_SOCKET), "board-order", BOARD_UPDATE_REASONS.CARD_MOVED);
    broadcastBoardUpdate(requestFrom(ACTOR_SOCKET), "board-order", BOARD_UPDATE_REASONS.CARD_MOVED);

    await vi.waitFor(() => expect(fake.emit).toHaveBeenCalledTimes(2));
    const versions = fake.emit.mock.calls.map(
      ([, payload]) => (payload as { board: { version: number } }).board.version
    );
    expect(versions).toEqual([1, 2]);
  });

  it("sends the snapshot to the board room, excluding the actor's own socket", async () => {
    vi.mocked(boardService.getBoardSnapshot).mockResolvedValue({ title: "Roadmap" });

    broadcastBoardUpdate(requestFrom(ACTOR_SOCKET), "board-emit", BOARD_UPDATE_REASONS.BOARD_UPDATED);

    await vi.waitFor(() => expect(fake.emit).toHaveBeenCalledTimes(1));
    expect(fake.to).toHaveBeenCalledWith("board:board-emit");
    expect(fake.except).toHaveBeenCalledWith(ACTOR_SOCKET);
    expect(fake.emit).toHaveBeenCalledWith(
      SOCKET_SERVER_EVENTS.BOARD_UPDATED,
      expect.objectContaining({ boardId: "board-emit", actorId: "user-1", board: { title: "Roadmap" } })
    );
  });

  it("still reaches every viewer when the caller has no socket", async () => {
    vi.mocked(boardService.getBoardSnapshot).mockResolvedValue({});

    broadcastBoardUpdate(requestFrom(), "board-no-socket", BOARD_UPDATE_REASONS.BOARD_UPDATED);

    await vi.waitFor(() => expect(fake.emit).toHaveBeenCalledTimes(1));
    expect(fake.except).toHaveBeenCalledWith("");
  });

  it("skips the snapshot when the registry says nobody but the actor is watching", async () => {
    vi.mocked(hasOtherBoardViewers).mockResolvedValue(false);

    broadcastBoardUpdate(requestFrom(ACTOR_SOCKET), "board-unwatched", BOARD_UPDATE_REASONS.BOARD_UPDATED);

    await vi.waitFor(() => expect(hasOtherBoardViewers).toHaveBeenCalledWith("board-unwatched", ACTOR_SOCKET));
    await settle();
    expect(boardService.getBoardSnapshot).not.toHaveBeenCalled();
    expect(fake.emit).not.toHaveBeenCalled();
  });

  it("does not consult the registry when another viewer is connected to this instance", async () => {
    fake.rooms.set("board:board-local", new Set([ACTOR_SOCKET, "other-viewer"]));
    vi.mocked(boardService.getBoardSnapshot).mockResolvedValue({});

    broadcastBoardUpdate(requestFrom(ACTOR_SOCKET), "board-local", BOARD_UPDATE_REASONS.BOARD_UPDATED);

    await vi.waitFor(() => expect(fake.emit).toHaveBeenCalledTimes(1));
    expect(hasOtherBoardViewers).not.toHaveBeenCalled();
  });

  it("invalidates the board cache even when Socket.io is not running", () => {
    vi.mocked(getIo).mockReturnValue(null);

    broadcastBoardUpdate(requestFrom(ACTOR_SOCKET), "board-no-io", BOARD_UPDATE_REASONS.BOARD_UPDATED);

    expect(boardService.invalidateBoardCache).toHaveBeenCalledWith("board-no-io");
  });

  it("ignores a missing board id", () => {
    broadcastBoardUpdate(requestFrom(ACTOR_SOCKET), undefined, BOARD_UPDATE_REASONS.BOARD_UPDATED);

    expect(boardService.invalidateBoardCache).not.toHaveBeenCalled();
  });

  it("keeps later updates flowing after a snapshot fails", async () => {
    vi.mocked(boardService.getBoardSnapshot)
      .mockRejectedValueOnce(new Error("mongo down"))
      .mockResolvedValueOnce({ version: 2 });

    broadcastBoardUpdate(requestFrom(ACTOR_SOCKET), "board-failure", BOARD_UPDATE_REASONS.BOARD_UPDATED);
    broadcastBoardUpdate(requestFrom(ACTOR_SOCKET), "board-failure", BOARD_UPDATE_REASONS.BOARD_UPDATED);

    await vi.waitFor(() => expect(fake.emit).toHaveBeenCalledTimes(1));
    expect(fake.emit.mock.calls[0]?.[1]).toMatchObject({ board: { version: 2 } });
  });
});

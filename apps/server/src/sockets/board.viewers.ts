import logger from "@workspace/shared/utils/logger";
import { parseBoardRoom } from "@workspace/shared/utils/socket-events";

import { getRedisClient } from "src/providers/redis.provider";
import type { AppServer } from "src/types/socket.type";

const viewerKey = (boardId: string): string => `bv:${boardId}`;

export const addBoardViewer = async (boardId: string, socketId: string): Promise<void> => {
  await getRedisClient().sadd(viewerKey(boardId), socketId);
};

export const removeBoardViewer = async (boardId: string, socketId: string): Promise<void> => {
  try {
    await getRedisClient().srem(viewerKey(boardId), socketId);
  } catch (error) {
    logger.warn(`Could not drop viewer ${socketId} from board ${boardId}: ${(error as Error).message}`);
  }
};

export const reconcileBoardViewers = async (boardId: string, liveSocketIds: string[]): Promise<void> => {
  try {
    const client = getRedisClient();
    const key = viewerKey(boardId);
    const recorded = await client.smembers(key);
    const live = new Set(liveSocketIds);
    const stale = recorded.filter((socketId) => !live.has(socketId));
    if (stale.length > 0) await client.srem(key, ...stale);
  } catch (error) {
    logger.warn(`Could not reconcile viewers of board ${boardId}: ${(error as Error).message}`);
  }
};

export const hasOtherBoardViewers = async (boardId: string, actorSocketId: string): Promise<boolean> => {
  try {
    const viewers = await getRedisClient().smembers(viewerKey(boardId));
    return viewers.some((socketId) => socketId !== actorSocketId);
  } catch (error) {
    logger.warn(`Could not read viewers of board ${boardId}, broadcasting anyway: ${(error as Error).message}`);
    return true;
  }
};

export const registerViewerRegistryRecovery = (io: AppServer): void => {
  getRedisClient().on("ready", () => {
    void (async (): Promise<void> => {
      try {
        const registrations: { boardId: string; socketId: string }[] = [];
        for (const socket of io.of("/").sockets.values()) {
          for (const room of socket.rooms) {
            const boardId = parseBoardRoom(room);
            if (boardId) registrations.push({ boardId, socketId: socket.id });
          }
        }

        if (registrations.length === 0) return;

        const pipeline = getRedisClient().pipeline();
        for (const { boardId, socketId } of registrations) pipeline.sadd(viewerKey(boardId), socketId);
        await pipeline.exec();

        logger.info(`Restored ${registrations.length} board viewer registrations after a Redis reconnect`);
      } catch (error) {
        logger.error(`Could not restore the board viewer registry: ${(error as Error).message}`);
      }
    })();
  });
};

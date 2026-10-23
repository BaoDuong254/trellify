import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import bcryptjs from "bcryptjs";
import ms, { StringValue } from "ms";

import { BOARD_TYPES } from "@workspace/shared/utils/constants";
import logger from "@workspace/shared/utils/logger";

import { BOARD_BLOOM, CARD_BLOOM, COLUMN_BLOOM, ENSURE_BLOOM_FILTERS } from "src/config/bloom";
import { CLOSE_DB, CONNECT_DB, GET_DB } from "src/config/database";
import environmentConfig from "src/config/environment";
import { boardModel } from "src/models/board.model";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";
import { userModel } from "src/models/user.model";
import { JwtProvider } from "src/providers/jwt.provider";
import { closeRedisClient, getRedisClient } from "src/providers/redis.provider";
import slugify from "src/utils/formatters";

const SEED_PREFIX = "k6-";

const BOARD_SIZES = {
  small: { columns: 4, cardsPerColumn: 10 },
  medium: { columns: 6, cardsPerColumn: 25 },
  large: { columns: 10, cardsPerColumn: 50 },
} as const;

type BoardSize = keyof typeof BOARD_SIZES;

interface SeededBoard {
  boardId: string;
  size: BoardSize;
  columnIds: string[];
  cardIds: string[];
}

interface SeededUser {
  email: string;
  password: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  boards: SeededBoard[];
}

interface SeedFile {
  users: SeededUser[];
  sharedBoards: SeededBoard[];
}

const readCount = (name: string, fallback: number): number => {
  const parsed = Number(process.env[name]);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const results: R[] = [];
  const queue = items.entries();
  const drain = async (): Promise<void> => {
    for (const [index, item] of queue) results[index] = await worker(item, index);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, drain));
  return results;
};

const outputPath = (): string => {
  const configured = process.env.SEED_OUTPUT;
  if (configured) return path.resolve(configured);
  return path.resolve(process.cwd(), "..", "..", "k6", "data", "users.json");
};

const cleanup = async (): Promise<void> => {
  const database = GET_DB();
  const boards = await database
    .collection(boardModel.BOARD_COLLECTION_NAME)
    .find({ title: { $regex: `^${SEED_PREFIX}` } }, { projection: { _id: 1 } })
    .toArray();
  const boardIds = boards.map((board) => board._id);

  const cards = await database.collection(cardModel.CARD_COLLECTION_NAME).deleteMany({ boardId: { $in: boardIds } });
  const columns = await database
    .collection(columnModel.COLUMN_COLLECTION_NAME)
    .deleteMany({ boardId: { $in: boardIds } });
  await database.collection(boardModel.BOARD_COLLECTION_NAME).deleteMany({ _id: { $in: boardIds } });
  const users = await database
    .collection(userModel.USER_COLLECTION_NAME)
    .deleteMany({ email: { $regex: `^${SEED_PREFIX}` } });

  logger.info(
    `Cleaned up ${users.deletedCount} users, ${boardIds.length} boards, ${columns.deletedCount} columns, ${cards.deletedCount} cards`
  );
};

const seedBoard = async (ownerId: string, name: string, size: BoardSize): Promise<SeededBoard> => {
  const { columns, cardsPerColumn } = BOARD_SIZES[size];
  const title = `${SEED_PREFIX}${name}`;

  const createdBoard = await boardModel.createNew(ownerId, {
    title,
    description: `Load test board ${name} (${size})`,
    type: BOARD_TYPES.PRIVATE,
    slug: slugify(title),
  });
  const boardId = createdBoard.insertedId.toString();

  const seededColumns = await Promise.all(
    Array.from({ length: columns }, async (_, columnIndex) => {
      const createdColumn = await columnModel.createNew({
        boardId,
        title: `${SEED_PREFIX}column-${columnIndex}`,
      });
      const columnId = createdColumn.insertedId.toString();

      const columnCardIds = await Promise.all(
        Array.from({ length: cardsPerColumn }, async (_, cardIndex) => {
          const createdCard = await cardModel.createNew({
            boardId,
            columnId,
            title: `${SEED_PREFIX}card-${columnIndex}-${cardIndex}`,
          });
          return createdCard.insertedId.toString();
        })
      );
      await columnModel.update(columnId, { cardOrderIds: columnCardIds });
      return { columnId, columnCardIds };
    })
  );

  const columnIds = seededColumns.map((column) => column.columnId);
  await boardModel.update(boardId, { columnOrderIds: columnIds });

  return { boardId, size, columnIds, cardIds: seededColumns.flatMap((column) => column.columnCardIds) };
};

const seed = async (): Promise<void> => {
  const userCount = readCount("SEED_USERS", 50);
  const boardsPerUser = readCount("SEED_BOARDS_PER_USER", 15);
  const mediumBoards = readCount("SEED_MEDIUM_BOARDS", 5);
  const largeBoards = readCount("SEED_LARGE_BOARDS", 5);
  const password = process.env.SEED_PASSWORD ?? "Loadtest123";

  const passwordHash = bcryptjs.hashSync(password, 10);
  const accessTokenLife = ms(environmentConfig.ACCESS_TOKEN_LIFE as StringValue) / 1000;
  const refreshTokenLife = ms(environmentConfig.REFRESH_TOKEN_LIFE as StringValue) / 1000;

  const concurrency = readCount("SEED_CONCURRENCY", 10);
  let seededUsers = 0;

  const users = await mapWithConcurrency(
    Array.from({ length: userCount }),
    concurrency,
    async (_, index): Promise<SeededUser> => {
      const username = `${SEED_PREFIX}user-${index}`;
      const email = `${username}@loadtest.local`;

      const createdUser = await userModel.createNew({
        email,
        password: passwordHash,
        username,
        displayName: username,
        verifyToken: null,
      });
      const userId = createdUser.insertedId.toString();
      await userModel.update(userId, { isActive: true });

      const boards: SeededBoard[] = [];
      for (let boardIndex = 0; boardIndex < boardsPerUser; boardIndex++) {
        boards.push(await seedBoard(userId, `board-${index}-${boardIndex}`, "small"));
      }

      const userInfo = { _id: createdUser.insertedId, email };
      const accessToken = await JwtProvider.generateToken(
        userInfo,
        environmentConfig.ACCESS_TOKEN_SECRET_SIGNATURE,
        accessTokenLife
      );
      const refreshToken = await JwtProvider.generateToken(
        userInfo,
        environmentConfig.REFRESH_TOKEN_SECRET_SIGNATURE,
        refreshTokenLife
      );

      seededUsers += 1;
      if (seededUsers % 10 === 0) logger.info(`Seeded ${seededUsers}/${userCount} users`);
      return { email, password, userId, accessToken, refreshToken, boards };
    }
  );

  const owner = users[0];
  if (!owner) throw new Error("SEED_USERS must be at least 1");

  const sharedBoards: SeededBoard[] = [];
  const sharedPlan: Array<[BoardSize, number]> = [
    ["medium", mediumBoards],
    ["large", largeBoards],
  ];

  for (const [size, count] of sharedPlan) {
    for (let index = 0; index < count; index++) {
      const board = await seedBoard(owner.userId, `shared-${size}-${index}`, size);
      await mapWithConcurrency(users.slice(1), concurrency, (user) =>
        boardModel.pushMemberIds(board.boardId, user.userId)
      );
      sharedBoards.push(board);
      logger.info(`Seeded shared ${size} board ${index + 1}/${count}`);
    }
  }

  const commentsPerCard = readCount("SEED_COMMENTS_PER_CARD", 0);
  if (commentsPerCard > 0) {
    const comments = Array.from({ length: commentsPerCard }, (_, index) => ({
      _id: `${SEED_PREFIX}comment-${index}`,
      userId: owner.userId,
      userEmail: owner.email,
      userAvatar: null,
      userDisplayName: `${SEED_PREFIX}user-0`,
      content: `Load test comment ${index}: a short note of realistic length describing progress on this card.`,
      commentedAt: new Date(),
    }));
    await GET_DB()
      .collection(cardModel.CARD_COLLECTION_NAME)
      .updateMany({ title: { $regex: `^${SEED_PREFIX}` } }, { $set: { comments } });
    logger.info(`Attached ${commentsPerCard} comments to every seeded card`);
  }

  const target = outputPath();
  const payload: SeedFile = { users, sharedBoards };
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  mkdirSync(path.dirname(target), { recursive: true });
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const ownedCards = users.reduce(
    (total, user) => total + user.boards.reduce((sum, b) => sum + b.cardIds.length, 0),
    0
  );
  const sharedCards = sharedBoards.reduce((total, board) => total + board.cardIds.length, 0);

  logger.info(
    `Seeded ${userCount} users, ${userCount * boardsPerUser} owned boards (small), ` +
      `${sharedBoards.length} shared boards (${mediumBoards} medium + ${largeBoards} large), ` +
      `${ownedCards + sharedCards} cards total`
  );
  logger.info(`Wrote ${target}`);
};

void (async () => {
  logger.info(`Connecting to ${environmentConfig.DATABASE_NAME}`);
  await CONNECT_DB();
  try {
    await cleanup();
    if (!process.argv.includes("--cleanup")) {
      await seed();
      logger.info("Rebuilding bloom filters so the running server sees the seeded ids");
      await getRedisClient().del(BOARD_BLOOM.key, COLUMN_BLOOM.key, CARD_BLOOM.key);
      await ENSURE_BLOOM_FILTERS();
    }
  } finally {
    await closeRedisClient();
    await CLOSE_DB();
  }
})();

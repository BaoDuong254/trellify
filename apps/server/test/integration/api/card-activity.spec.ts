import request from "supertest";
import { describe, expect, it } from "vitest";

import { CARD_ACTIVITY_TYPES } from "@workspace/shared/schemas/activity.schema";

import {
  type TestUser,
  createActiveUser,
  createBoardVia,
  createCardVia,
  createColumnVia,
  getApp,
} from "test/integration/helpers";

interface ActivityEntry {
  type: string;
  data: Record<string, unknown>;
  actor: { displayName: string };
}

const getActivities = async (actor: TestUser, cardId: string): Promise<ActivityEntry[]> => {
  const response = await request(getApp())
    .get(`/api/v1/cards/${cardId}/activities`)
    .set("Cookie", actor.cookie)
    .expect(200);
  return response.body.data;
};

describe("GET /api/v1/cards/:id/activities", () => {
  it("records creation, updates and moves newest first with the actor's name", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const todo = await createColumnVia(owner, boardId, "To do");
    const done = await createColumnVia(owner, boardId, "Done");
    const cardId = await createCardVia(owner, boardId, todo, "Write tests");

    await request(getApp())
      .put(`/api/v1/cards/${cardId}`)
      .set("Cookie", owner.cookie)
      .send({ title: "Write more tests" })
      .expect(200);
    await request(getApp())
      .put("/api/v1/boards/supports/moving_card")
      .set("Cookie", owner.cookie)
      .send({
        currentCardId: cardId,
        prevColumnId: todo,
        prevCardOrderIds: [],
        nextColumnId: done,
        nextCardOrderIds: [cardId],
      })
      .expect(200);

    const activities = await getActivities(owner, cardId);

    expect(activities.map((activity) => activity.type)).toEqual([
      CARD_ACTIVITY_TYPES.CARD_MOVED,
      CARD_ACTIVITY_TYPES.TITLE_CHANGED,
      CARD_ACTIVITY_TYPES.CARD_CREATED,
    ]);
    expect(activities[0]?.data).toEqual({ from: "To do", to: "Done" });
    expect(activities[1]?.data).toEqual({ from: "Write tests", to: "Write more tests" });
    expect(activities[0]?.actor.displayName).toBe("owner");
  });

  it("does not record an update that changes nothing", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId, "Same title");

    await request(getApp())
      .put(`/api/v1/cards/${cardId}`)
      .set("Cookie", owner.cookie)
      .send({ title: "Same title" })
      .expect(200);

    expect(await getActivities(owner, cardId)).toHaveLength(1);
  });

  it("hides a card's history from users outside the board", async () => {
    const owner = await createActiveUser("owner");
    const outsider = await createActiveUser("outsider");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId);

    await request(getApp()).get(`/api/v1/cards/${cardId}/activities`).set("Cookie", outsider.cookie).expect(403);
  });
});

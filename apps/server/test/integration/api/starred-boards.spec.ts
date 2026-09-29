import request from "supertest";
import { describe, expect, it } from "vitest";

import { type TestUser, addBoardMember, createActiveUser, createBoardVia, getApp } from "test/integration/helpers";

const star = (actor: TestUser, boardId: string, isStarred: boolean) =>
  request(getApp()).put(`/api/v1/boards/${boardId}/star`).set("Cookie", actor.cookie).send({ starred: isStarred });

const getStarred = async (actor: TestUser): Promise<{ _id: string; title: string }[]> => {
  const response = await request(getApp()).get("/api/v1/boards/starred").set("Cookie", actor.cookie).expect(200);
  return response.body.data;
};

describe("starred boards", () => {
  it("stars and unstars a board the user can access", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner, "Roadmap");

    await star(owner, boardId, true).expect(200);
    await star(owner, boardId, true).expect(200);
    expect(await getStarred(owner)).toEqual([{ _id: boardId, title: "Roadmap" }]);

    await star(owner, boardId, false).expect(200);
    expect(await getStarred(owner)).toEqual([]);
  });

  it("refuses to star a board the user cannot access", async () => {
    const owner = await createActiveUser("owner");
    const outsider = await createActiveUser("outsider");
    const boardId = await createBoardVia(owner);

    const response = await star(outsider, boardId, true).expect(403);
    expect(response.body.message).toBe("Error.BoardAccessDenied");
  });

  it("drops boards the user lost access to or that were deleted", async () => {
    const owner = await createActiveUser("owner");
    const member = await createActiveUser("member");
    const kept = await createBoardVia(owner, "Kept");
    const deleted = await createBoardVia(owner, "Deleted");
    const left = await createBoardVia(owner, "Left");
    for (const boardId of [kept, deleted, left]) {
      await addBoardMember(boardId, member.userId);
      await star(member, boardId, true).expect(200);
    }

    await request(getApp()).delete(`/api/v1/boards/${deleted}`).set("Cookie", owner.cookie).expect(200);
    await request(getApp())
      .delete(`/api/v1/boards/${left}/members/${member.userId}`)
      .set("Cookie", member.cookie)
      .expect(200);

    expect(await getStarred(member)).toEqual([{ _id: kept, title: "Kept" }]);
  });

  it("does not let a profile update write starredBoardIds", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);

    await request(getApp())
      .put("/api/v1/users/update")
      .set("Cookie", owner.cookie)
      .send({ displayName: "Owner", starredBoardIds: [boardId] })
      .expect(200);

    expect(await getStarred(owner)).toEqual([]);
  });
});

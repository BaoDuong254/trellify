import request from "supertest";
import { describe, expect, it } from "vitest";

import { emailQueue } from "src/queues/email/email.queue";
import { createActiveUser, createBoardVia, createCardVia, createColumnVia, getApp } from "test/integration/helpers";

const queuedJobs = async () => await emailQueue.getJobs(["waiting", "delayed"]);

describe("email jobs", () => {
  it("queues an invitation email for the invitee", async () => {
    const owner = await createActiveUser("owner");
    const invitee = await createActiveUser("invitee");
    const boardId = await createBoardVia(owner, "Roadmap");

    await request(getApp())
      .post("/api/v1/invitations/board")
      .set("Cookie", owner.cookie)
      .send({ inviteeEmail: invitee.email, boardId })
      .expect(201);

    const jobs = await queuedJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.data).toMatchObject({ kind: "send-email", to: invitee.email });
    expect(jobs[0]?.data.kind === "send-email" && jobs[0].data.html).toContain("Roadmap");
  });

  it("schedules one reminder per due date, a day before it", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId);
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    for (let attempt = 0; attempt < 2; attempt++) {
      await request(getApp())
        .put(`/api/v1/cards/${cardId}`)
        .set("Cookie", owner.cookie)
        .send({ dueDate: dueDate.toISOString() })
        .expect(200);
    }

    const jobs = await queuedJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.data).toEqual({ kind: "due-reminder", cardId, dueTs: dueDate.getTime() });
    expect(jobs[0]?.opts.delay).toBeGreaterThan(47 * 60 * 60 * 1000);
  });

  it("does not schedule a reminder for a due date in the past", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId);

    await request(getApp())
      .put(`/api/v1/cards/${cardId}`)
      .set("Cookie", owner.cookie)
      .send({ dueDate: new Date(Date.now() - 60_000).toISOString() })
      .expect(200);

    expect(await queuedJobs()).toHaveLength(0);
  });
});

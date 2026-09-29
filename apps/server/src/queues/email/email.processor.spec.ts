import type { Job } from "bullmq";
import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { boardModel } from "src/models/board.model";
import { cardModel } from "src/models/card.model";
import { userModel } from "src/models/user.model";
import { BrevoProvider } from "src/providers/brevo.provider";
import type { EmailJobData } from "src/queues/email/email.interface";
import { processEmailJob } from "src/queues/email/email.processor";

vi.mock("src/models/card.model", () => ({ cardModel: { findOneById: vi.fn() } }));
vi.mock("src/models/board.model", () => ({ boardModel: { findOneById: vi.fn() } }));
vi.mock("src/models/user.model", () => ({ userModel: { findOneById: vi.fn() } }));
vi.mock("src/providers/brevo.provider", () => ({ BrevoProvider: { sendEmail: vi.fn() } }));

const DUE_TS = Date.UTC(2030, 0, 2);
const cardId = new ObjectId().toString();
const memberId = new ObjectId();

const updateData = vi.fn();
const run = (data: EmailJobData) => processEmailJob({ data, updateData } as unknown as Job<EmailJobData>);

const dueCard = (overrides: Record<string, unknown> = {}) => ({
  _id: new ObjectId(cardId),
  boardId: new ObjectId(),
  title: "Ship <it>",
  dueDate: new Date(DUE_TS),
  dueComplete: false,
  archivedAt: null,
  memberIds: [memberId],
  ...overrides,
});

describe("processEmailJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(boardModel.findOneById).mockResolvedValue({ _id: new ObjectId(), title: "Roadmap", _destroy: false });
    vi.mocked(userModel.findOneById).mockResolvedValue({
      _id: memberId,
      email: "member@trellify.test",
      isActive: true,
    });
  });

  it("sends a plain email job as is", async () => {
    await run({ kind: "send-email", to: "a@trellify.test", subject: "Hi", html: "<p>Hi</p>" });

    expect(BrevoProvider.sendEmail).toHaveBeenCalledWith("a@trellify.test", "Hi", "<p>Hi</p>");
  });

  it("emails every active member of a card that is still due, escaping the title", async () => {
    vi.mocked(cardModel.findOneById).mockResolvedValue(dueCard());

    await run({ kind: "due-reminder", cardId, dueTs: DUE_TS });

    expect(BrevoProvider.sendEmail).toHaveBeenCalledTimes(1);
    const [to, , html] = vi.mocked(BrevoProvider.sendEmail).mock.calls[0] ?? [];
    expect(to).toBe("member@trellify.test");
    expect(html).toContain("Ship &lt;it&gt;");
  });

  it("matches a due date that carries milliseconds", async () => {
    const dueTs = DUE_TS + 123;
    vi.mocked(cardModel.findOneById).mockResolvedValue(dueCard({ dueDate: new Date(dueTs) }));

    await run({ kind: "due-reminder", cardId, dueTs });

    expect(BrevoProvider.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("does not email a member again when a retried job already reached them", async () => {
    vi.mocked(cardModel.findOneById).mockResolvedValue(dueCard());

    await run({ kind: "due-reminder", cardId, dueTs: DUE_TS, sentTo: ["member@trellify.test"] });

    expect(BrevoProvider.sendEmail).not.toHaveBeenCalled();
  });

  it("records every recipient on the job as it goes and skips deleted users", async () => {
    const deletedId = new ObjectId();
    vi.mocked(cardModel.findOneById).mockResolvedValue(dueCard({ memberIds: [memberId, deletedId] }));
    vi.mocked(userModel.findOneById).mockImplementation(async (id: string) =>
      id === String(deletedId)
        ? { _id: deletedId, email: "gone@trellify.test", isActive: true, _destroy: true }
        : { _id: memberId, email: "member@trellify.test", isActive: true }
    );

    await run({ kind: "due-reminder", cardId, dueTs: DUE_TS });

    expect(BrevoProvider.sendEmail).toHaveBeenCalledTimes(1);
    expect(updateData).toHaveBeenCalledWith(expect.objectContaining({ sentTo: ["member@trellify.test"] }));
  });

  it.each([
    ["the card is gone", null],
    ["the card is archived", dueCard({ archivedAt: new Date() })],
    ["the due date is complete", dueCard({ dueComplete: true })],
    ["the due date moved", dueCard({ dueDate: new Date(DUE_TS + 60_000) })],
    ["the card has no members", dueCard({ memberIds: [] })],
  ])("skips the reminder when %s", async (_reason, card) => {
    vi.mocked(cardModel.findOneById).mockResolvedValue(card);

    await run({ kind: "due-reminder", cardId, dueTs: DUE_TS });

    expect(BrevoProvider.sendEmail).not.toHaveBeenCalled();
  });
});

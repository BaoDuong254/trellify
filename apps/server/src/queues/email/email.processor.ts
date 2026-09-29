import { type Job, type Processor } from "bullmq";
import { escape as escapeHtml } from "lodash";
import { ObjectId } from "mongodb";

import logger from "@workspace/shared/utils/logger";

import environmentConfig from "src/config/environment";
import { boardModel } from "src/models/board.model";
import { cardModel } from "src/models/card.model";
import { userModel } from "src/models/user.model";
import { BrevoProvider } from "src/providers/brevo.provider";
import { DueReminderJobData, EmailJobData } from "src/queues/email/email.interface";

const processDueReminder = async (job: Job<EmailJobData>, data: DueReminderJobData): Promise<void> => {
  const { cardId, dueTs } = data;
  const card = await cardModel.findOneById(new ObjectId(cardId));
  const isStillDue =
    card &&
    !card.archivedAt &&
    !card.dueComplete &&
    card.dueDate instanceof Date &&
    card.dueDate.getTime() === dueTs &&
    (card.memberIds ?? []).length > 0;
  if (!isStillDue) {
    logger.info(`[EmailQueue] Skipping due reminder for card ${cardId}: no longer applicable`);
    return;
  }

  const [board, members] = await Promise.all([
    boardModel.findOneById(new ObjectId(String(card.boardId))),
    Promise.all((card.memberIds ?? []).map((id: ObjectId) => userModel.findOneById(String(id)))),
  ]);
  if (!board || board._destroy) return;

  const link = `${environmentConfig.CLIENT_URL}/boards/${String(card.boardId)}`;
  const subject = `Trellify - "${card.title}" is due soon`;
  const html = `
    <h1>Card due soon</h1>
    <p>The card <strong>${escapeHtml(String(card.title))}</strong> on board <strong>${escapeHtml(String(board.title))}</strong>
    is due on ${new Date(dueTs).toUTCString()}.</p>
    <a href="${link}">Open the board</a>
    <p>Best regards,<br/>The Trellify Team</p>
  `;

  const sentTo = [...(data.sentTo ?? [])];
  for (const member of members) {
    const email = member?.email ? String(member.email) : null;
    if (!email || !member?.isActive || member._destroy || sentTo.includes(email)) continue;
    await BrevoProvider.sendEmail(email, subject, html);
    sentTo.push(email);
    await job.updateData({ ...data, sentTo });
  }
};

export const processEmailJob: Processor<EmailJobData> = async (job: Job<EmailJobData>): Promise<void> => {
  const { data } = job;
  if (data.kind === "due-reminder") {
    await processDueReminder(job, data);
    return;
  }
  await BrevoProvider.sendEmail(data.to, data.subject, data.html);
};

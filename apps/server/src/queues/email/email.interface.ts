interface SendEmailJobData {
  kind: "send-email";
  to: string;
  subject: string;
  html: string;
}

export interface DueReminderJobData {
  kind: "due-reminder";
  cardId: string;
  dueTs: number;
  sentTo?: string[];
}

export type EmailJobData = SendEmailJobData | DueReminderJobData;

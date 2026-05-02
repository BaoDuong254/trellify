import { BrevoClient } from "@getbrevo/brevo";
import environmentConfig from "src/config/environment";

const brevoClient = new BrevoClient({ apiKey: environmentConfig.BREVO_API_KEY });

const sendEmail = async (recipientEmail: string, customSubject: string, customHtmlContent: string): Promise<void> => {
  await brevoClient.transactionalEmails.sendTransacEmail({
    sender: { email: environmentConfig.ADMIN_EMAIL_ADDRESS, name: environmentConfig.ADMIN_EMAIL_NAME },
    to: [{ email: recipientEmail }],
    subject: customSubject,
    htmlContent: customHtmlContent,
  });
};

export const BrevoProvider = {
  sendEmail,
};

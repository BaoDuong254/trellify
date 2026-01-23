import { TransactionalEmailsApi, SendSmtpEmail } from "@getbrevo/brevo";
import environmentConfig from "src/config/environment";

const apiInstance = new TransactionalEmailsApi();
apiInstance.setApiKey(0, environmentConfig.BREVO_API_KEY);

const sendEmail = async (recipientEmail: string, customSubject: string, customHtmlContent: string) => {
  const sendSmtpEmail = new SendSmtpEmail();

  sendSmtpEmail.sender = { email: environmentConfig.ADMIN_EMAIL_ADDRESS, name: environmentConfig.ADMIN_EMAIL_NAME };

  sendSmtpEmail.to = [{ email: recipientEmail }];

  sendSmtpEmail.subject = customSubject;

  sendSmtpEmail.htmlContent = customHtmlContent;

  return apiInstance.sendTransacEmail(sendSmtpEmail);
};

export const BrevoProvider = {
  sendEmail,
};

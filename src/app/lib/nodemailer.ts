import path from "node:path";
import ejs from "ejs";
import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import config from "../config";

export const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
});

type TemplateName =
  | "welcome"
  | "verify-otp"
  | "reset-password"
  | "order-confirmation"
  | "order-status"
  | "contact-received";

/**
 * Renders an EJS template from src/app/templates and sends it.
 * With no SMTP credentials configured the email is logged instead of thrown,
 * so local demo flows still complete end-to-end.
 */
export async function sendEmail(
  to: string,
  subject: string,
  template: TemplateName,
  data: Record<string, unknown>,
  attachments?: Mail.Attachment[],
) {
  const file = path.join(process.cwd(), "src", "app", "templates", `${template}.ejs`);

  let html: string;
  try {
    html = await ejs.renderFile(file, { ...data, brand: "NORVA", tagline: "Style Without Limits" });
  } catch {
    html = `<p>${subject}</p><pre>${JSON.stringify(data, null, 2)}</pre>`;
  }

  if (!config.smtp.user || !config.smtp.pass) {
    console.info(`📭 [email skipped — SMTP not configured] ${subject} → ${to}`);
    return { skipped: true };
  }

  await transporter.sendMail({
    from: config.smtp.sender,
    to,
    subject,
    html,
    attachments,
  });

  return { skipped: false };
}

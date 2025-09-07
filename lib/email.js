import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";

import { logger } from "./logger.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number.parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_AUTH_USER,
        pass: process.env.SMTP_AUTH_PASS,
      },
    });
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error("❌ Failed to verify SMTP connection:", error);
      return false;
    }
  }

  async sendMagicLink(email, token, forceRealSend = null) {
    const loginUrl = `${process.env.APP_URL}/api/auth/verify?token=${token}`;

    const htmlTemplate = this.createMagicLinkTemplate(email, loginUrl);

    // Determine if we should skip email sending
    const shouldSkip =
      forceRealSend !== null ? !forceRealSend : process.env.NODE_ENV === "test";

    if (shouldSkip) {
      logger.debug("🧪 Test mode - skipping email send to:", email);
      logger.debug("🔗 Magic Link (test):", loginUrl);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM_ADDRESS,
        to: email,
        subject: "Login to Insight Magician",
        html: htmlTemplate,
        text: `Click this link to login: ${loginUrl}`,
      });

      // In development, also log the magic link for easy testing
      if (process.env.NODE_ENV === "development") {
        logger.debug("🔗 Magic Link (dev):", loginUrl);
      }

      return true;
    } catch (error) {
      logger.error("❌ Failed to send magic link email:", error);
      throw error;
    }
  }

  createMagicLinkTemplate(email, loginUrl) {
    const templatePath = join(__dirname, "../templates/magic-link-email.html");
    let template = readFileSync(templatePath, "utf8");

    template = template
      .replaceAll("{{loginUrl}}", loginUrl)
      .replaceAll("{{email}}", email);

    return template;
  }
}

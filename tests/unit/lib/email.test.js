import { beforeEach, describe, expect, mock, test } from "bun:test";
import { EmailService } from "../../../lib/email.js";

// Mock environment variables
process.env.APP_URL = "http://localhost:3000";
process.env.NODE_ENV = "test";
process.env.EMAIL_FROM_ADDRESS = "test@example.com";
process.env.SMTP_HOST = "smtp.example.com";
process.env.SMTP_PORT = "587";
process.env.SMTP_SECURE = "false";
process.env.SMTP_AUTH_USER = "test@example.com";
process.env.SMTP_AUTH_PASS = "testpass";

let emailService;

beforeEach(() => {
  emailService = new EmailService();

  // Mock the transporter methods
  emailService.transporter.verify = mock(() => Promise.resolve(true));
  emailService.transporter.sendMail = mock(() =>
    Promise.resolve({ messageId: "test-id" }),
  );
});

describe("EmailService - Configuration", () => {
  test("should initialize with correct SMTP configuration", () => {
    expect(emailService.transporter).toBeTruthy();
    // Test that transporter was configured with our mock env vars
    expect(emailService.transporter.options.host).toBe("smtp.example.com");
    expect(emailService.transporter.options.port).toBe(587);
    expect(emailService.transporter.options.secure).toBe(false);
    expect(emailService.transporter.options.auth.user).toBe("test@example.com");
    expect(emailService.transporter.options.auth.pass).toBe("testpass");
  });
});

describe("EmailService - Connection Verification", () => {
  test("should verify connection successfully", async () => {
    const isConnected = await emailService.verifyConnection();

    expect(isConnected).toBe(true);
    expect(emailService.transporter.verify).toHaveBeenCalledTimes(1);
  });

  test("should handle connection failure gracefully", async () => {
    // Mock connection failure
    emailService.transporter.verify = mock(() =>
      Promise.reject(new Error("Connection failed")),
    );

    const isConnected = await emailService.verifyConnection();

    expect(isConnected).toBe(false);
    expect(emailService.transporter.verify).toHaveBeenCalledTimes(1);
  });
});

describe("EmailService - Magic Link Sending", () => {
  test("should send magic link email successfully", async () => {
    const email = "test@example.com";
    const token = "test-token-123";

    const result = await emailService.sendMagicLink(email, token);

    expect(result).toBe(true);
    expect(emailService.transporter.sendMail).toHaveBeenCalledTimes(1);

    const sendMailCall = emailService.transporter.sendMail.mock.calls[0][0];
    expect(sendMailCall.from).toBe("test@example.com");
    expect(sendMailCall.to).toBe(email);
    expect(sendMailCall.subject).toBe("Login to Insight Magician");
    expect(sendMailCall.html).toContain(
      "http://localhost:3000/api/auth/verify?token=test-token-123",
    );
    expect(sendMailCall.text).toContain(
      "http://localhost:3000/api/auth/verify?token=test-token-123",
    );
  });

  test("should handle email sending failure", async () => {
    // Mock sending failure
    emailService.transporter.sendMail = mock(() =>
      Promise.reject(new Error("Send failed")),
    );

    const email = "test@example.com";
    const token = "test-token-123";

    await expect(emailService.sendMagicLink(email, token)).rejects.toThrow(
      "Send failed",
    );
  });

  test("should log magic link in development mode", async () => {
    // Set to development mode
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const consoleSpy = mock(() => {});
    console.log = consoleSpy;

    const email = "dev@example.com";
    const token = "dev-token-123";

    await emailService.sendMagicLink(email, token);

    expect(consoleSpy).toHaveBeenCalled();
    const logCall = consoleSpy.mock.calls.find((call) =>
      call[0]?.includes("Magic Link (dev)"),
    );
    expect(logCall).toBeTruthy();
    expect(logCall[1]).toContain(
      "http://localhost:3000/api/auth/verify?token=dev-token-123",
    );

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });
});

describe("EmailService - Email Template", () => {
  test("should create well-formed HTML template", () => {
    const email = "template@example.com";
    const loginUrl = "http://localhost:3000/api/auth/verify?token=test-123";

    const template = emailService.createMagicLinkTemplate(email, loginUrl);

    expect(template).toContain("<!DOCTYPE html>");
    expect(template).toContain("Login to Insight Magician");
    expect(template).toContain("🔍 Insight Magician");
    expect(template).toContain(loginUrl);
    expect(template).toContain(email);
    expect(template).toContain("This link expires in 24 hours");
    expect(template).toContain("It can only be used once");
    expect(template).toContain("Login to Dashboard");
  });

  test("should include security notices in template", () => {
    const email = "security@example.com";
    const loginUrl = "http://localhost:3000/api/auth/verify?token=security-123";

    const template = emailService.createMagicLinkTemplate(email, loginUrl);

    expect(template).toContain("🔒 Security Notice:");
    expect(template).toContain("This link expires in 24 hours");
    expect(template).toContain("It can only be used once");
    expect(template).toContain("If you didn't request this");
  });

  test("should include proper styling and structure", () => {
    const email = "style@example.com";
    const loginUrl = "http://localhost:3000/api/auth/verify?token=style-123";

    const template = emailService.createMagicLinkTemplate(email, loginUrl);

    expect(template).toContain("<style>");
    expect(template).toContain(".header");
    expect(template).toContain(".content");
    expect(template).toContain(".footer");
    expect(template).toContain(".login-button");
    expect(template).toContain("gradient");
    expect(template).toContain("border-radius");
  });

  test("should handle special characters in email and URL", () => {
    const email = "test+tag@example-domain.co.uk";
    const loginUrl = "http://localhost:3000/api/auth/verify?token=abc123%2Bdef";

    const template = emailService.createMagicLinkTemplate(email, loginUrl);

    expect(template).toContain(email);
    expect(template).toContain(loginUrl);
  });
});

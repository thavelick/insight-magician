#!/usr/bin/env bun
import { EmailService } from "./lib/email.js";

console.log("🔧 Testing Email Configuration...\n");

// Show current config (without sensitive data)
console.log("📧 SMTP Configuration:");
console.log(`  Host: ${process.env.SMTP_HOST}`);
console.log(`  Port: ${process.env.SMTP_PORT}`);
console.log(`  Secure: ${process.env.SMTP_SECURE}`);
console.log(`  User: ${process.env.SMTP_AUTH_USER}`);
console.log(`  From: ${process.env.EMAIL_FROM_ADDRESS}`);
console.log(`  App URL: ${process.env.APP_URL}\n`);

const emailService = new EmailService();

// Test 1: Verify SMTP connection
console.log("🔍 Testing SMTP connection...");
try {
  const isConnected = await emailService.verifyConnection();
  if (isConnected) {
    console.log("✅ SMTP connection successful!\n");
  } else {
    console.log("❌ SMTP connection failed (check logs above)\n");
    process.exit(1);
  }
} catch (error) {
  console.error("❌ SMTP connection error:", error.message);
  process.exit(1);
}

// Test 2: Send a test magic link email
const testEmail = process.env.SMTP_AUTH_USER; // Send to yourself
const testToken = "test-token-12345";

console.log(`📨 Sending test magic link to: ${testEmail}`);
try {
  await emailService.sendMagicLink(testEmail, testToken);
  console.log("✅ Test email sent successfully!");
  console.log(`📬 Check your inbox at ${testEmail}`);

  if (process.env.NODE_ENV === "development") {
    console.log("\n🔗 Magic link (dev mode):");
    console.log(`   ${process.env.APP_URL}/api/auth/verify?token=${testToken}`);
  }
} catch (error) {
  console.error("❌ Failed to send test email:", error.message);
  process.exit(1);
}

console.log("\n✅ Email configuration test completed successfully!");

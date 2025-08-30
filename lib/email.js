import nodemailer from "nodemailer";

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
      console.error("❌ Failed to verify SMTP connection:", error);
      return false;
    }
  }

  async sendMagicLink(email, token) {
    const loginUrl = `${process.env.APP_URL}/api/auth/verify?token=${token}`;

    const htmlTemplate = this.createMagicLinkTemplate(email, loginUrl);

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
        console.log("🔗 Magic Link (dev):", loginUrl);
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to send magic link email:", error);
      throw error;
    }
  }

  createMagicLinkTemplate(email, loginUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login to Insight Magician</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .content {
      padding: 30px;
    }
    .login-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      padding: 15px 30px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      font-size: 14px;
      color: #666;
      border-top: 1px solid #eee;
    }
    .security-note {
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 Insight Magician</h1>
      <p>Your secure login link is ready</p>
    </div>
    
    <div class="content">
      <p>Hello,</p>
      
      <p>You requested to log in to Insight Magician. Click the button below to securely access your dashboard:</p>
      
      <div style="text-align: center;">
        <a href="${loginUrl}" class="login-button">Login to Dashboard</a>
      </div>
      
      <div class="security-note">
        <strong>🔒 Security Notice:</strong>
        <ul>
          <li>This link expires in 24 hours</li>
          <li>It can only be used once</li>
          <li>If you didn't request this, you can safely ignore this email</li>
        </ul>
      </div>
      
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">
        ${loginUrl}
      </p>
    </div>
    
    <div class="footer">
      <p>This login attempt was made for: <strong>${email}</strong></p>
      <p>If you need help, please contact support.</p>
      <p><em>Insight Magician - Transform your data into insights</em></p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}

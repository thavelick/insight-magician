import { randomBytes } from "node:crypto";
import { EmailService } from "./email.js";

export class AuthManager {
  constructor(appDatabase) {
    this.db = appDatabase;
    this.emailService = new EmailService();
  }

  generateSecureToken() {
    return randomBytes(32).toString("hex");
  }

  generateSessionId() {
    return randomBytes(32).toString("hex");
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async sendMagicLink(email) {
    try {
      if (!this.isValidEmail(email)) {
        throw new Error("Invalid email format");
      }

      const normalizedEmail = email.toLowerCase();

      let user = await this.db.users.getByEmail(normalizedEmail);
      if (!user) {
        user = await this.db.users.create(normalizedEmail);
      }

      const token = this.generateSecureToken();
      const expiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString(); // 24 hours

      await this.db.authTokens.create(user.id, token, expiresAt);

      await this.emailService.sendMagicLink(normalizedEmail, token);

      return { success: true, message: "Magic link sent to your email" };
    } catch (error) {
      console.error("❌ Failed to send magic link:", error);
      throw error;
    }
  }

  async verifyToken(token) {
    try {
      if (!token) {
        throw new Error("Token is required");
      }

      const authToken = await this.db.authTokens.getByToken(token);

      if (!authToken) {
        throw new Error("Invalid or expired token");
      }

      if (authToken.used_at) {
        throw new Error("Token has already been used");
      }

      const now = new Date();
      const expiresAt = new Date(authToken.expires_at);
      if (now > expiresAt) {
        throw new Error("Token has expired");
      }

      await this.db.authTokens.markAsUsed(token);

      await this.db.users.updateLastLogin(authToken.user_id);

      const sessionId = this.generateSessionId();
      const sessionExpiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      ).toISOString();

      await this.db.sessions.create(
        sessionId,
        authToken.user_id,
        sessionExpiresAt,
      );

      return {
        success: true,
        sessionId,
        user: {
          id: authToken.user_id,
          email: authToken.email,
        },
      };
    } catch (error) {
      console.error("❌ Failed to verify token:", error);
      throw error;
    }
  }

  async validateSession(sessionId) {
    try {
      if (!sessionId) {
        return null;
      }

      const session = await this.db.sessions.getById(sessionId);

      if (!session) {
        return null;
      }

      // Session automatically excludes expired ones in the database query
      return {
        id: session.user_id,
        email: session.email,
        sessionId: session.id,
      };
    } catch (error) {
      console.error("❌ Failed to validate session:", error);
      return null;
    }
  }

  async logout(sessionId) {
    try {
      if (!sessionId) {
        return { success: true, message: "No session to logout" };
      }

      await this.db.sessions.delete(sessionId);

      return { success: true, message: "Logged out successfully" };
    } catch (error) {
      console.error("❌ Failed to logout:", error);
      throw error;
    }
  }

  async cleanupExpired() {
    try {
      // Note: Sessions are automatically filtered by expiration in queries
      // This method could be extended to actually delete expired records for maintenance

      console.log("🧹 Cleanup expired tokens and sessions (placeholder)");
      return { success: true, message: "Cleanup completed" };
    } catch (error) {
      console.error("❌ Failed to cleanup expired items:", error);
      throw error;
    }
  }
}

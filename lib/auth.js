import { randomBytes } from "node:crypto";
import { EmailService } from "./email.js";

export class AuthManager {
  constructor(appDatabase) {
    this.db = appDatabase;
    this.emailService = new EmailService();
  }

  // Generate cryptographically secure token
  generateSecureToken() {
    return randomBytes(32).toString("hex");
  }

  // Generate cryptographically secure session ID
  generateSessionId() {
    return randomBytes(32).toString("hex");
  }

  // Validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Magic link workflow - send login email
  async sendMagicLink(email) {
    try {
      // Validate email format
      if (!this.isValidEmail(email)) {
        throw new Error("Invalid email format");
      }

      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase();

      // Find or create user
      let user = await this.db.users.getByEmail(normalizedEmail);
      if (!user) {
        user = await this.db.users.create(normalizedEmail);
      }

      // Generate secure token
      const token = this.generateSecureToken();
      const expiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString(); // 24 hours

      // Store auth token
      await this.db.authTokens.create(user.id, token, expiresAt);

      // Send magic link email
      await this.emailService.sendMagicLink(normalizedEmail, token);

      return { success: true, message: "Magic link sent to your email" };
    } catch (error) {
      console.error("❌ Failed to send magic link:", error);
      throw error;
    }
  }

  // Verify magic link token and create session
  async verifyToken(token) {
    try {
      if (!token) {
        throw new Error("Token is required");
      }

      // Get token with user info
      const authToken = await this.db.authTokens.getByToken(token);

      if (!authToken) {
        throw new Error("Invalid or expired token");
      }

      // Check if token is already used
      if (authToken.used_at) {
        throw new Error("Token has already been used");
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(authToken.expires_at);
      if (now > expiresAt) {
        throw new Error("Token has expired");
      }

      // Mark token as used
      await this.db.authTokens.markAsUsed(token);

      // Update user's last login
      await this.db.users.updateLastLogin(authToken.user_id);

      // Create new session
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

  // Validate existing session
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

  // Logout - cleanup session
  async logout(sessionId) {
    try {
      if (!sessionId) {
        return { success: true, message: "No session to logout" };
      }

      // Delete the session
      await this.db.sessions.delete(sessionId);

      return { success: true, message: "Logged out successfully" };
    } catch (error) {
      console.error("❌ Failed to logout:", error);
      throw error;
    }
  }

  // Cleanup expired tokens and sessions (maintenance task)
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

export function createAuthTokenRepository(db) {
  return {
    // Note: token must be cryptographically secure (crypto.randomBytes(32).toString('hex'))
    async create(userId, token, expiresAt) {
      try {
        const stmt = db.prepare(`
          INSERT INTO auth_tokens (user_id, token, expires_at) 
          VALUES (?, ?, ?)
          RETURNING id, token, expires_at
        `);

        return stmt.get(userId, token, expiresAt);
      } catch (error) {
        console.error("❌ Failed to create auth token:", error);
        throw error;
      }
    },

    async getByToken(token) {
      try {
        const stmt = db.prepare(`
          SELECT t.id, t.token, t.user_id, t.expires_at, t.used_at, u.email
          FROM auth_tokens t
          JOIN users u ON t.user_id = u.id
          WHERE t.token = ? AND t.used_at IS NULL
        `);

        return stmt.get(token);
      } catch (error) {
        console.error("❌ Failed to get auth token:", error);
        throw error;
      }
    },
  };
}

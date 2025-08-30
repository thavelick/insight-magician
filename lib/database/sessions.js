export function createSessionRepository(db) {
  return {
    // Note: sessionId must be cryptographically secure (crypto.randomBytes(32).toString('hex'))
    async create(sessionId, userId, expiresAt) {
      try {
        const stmt = db.prepare(`
          INSERT INTO sessions (id, user_id, expires_at) 
          VALUES (?, ?, ?)
          RETURNING id, user_id, expires_at
        `);

        return stmt.get(sessionId, userId, expiresAt);
      } catch (error) {
        console.error("❌ Failed to create session:", error);
        throw error;
      }
    },

    async getById(sessionId) {
      try {
        const stmt = db.prepare(`
          SELECT s.id, s.user_id, s.expires_at, u.email
          FROM sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.id = ? AND datetime(s.expires_at) > datetime('now')
        `);

        return stmt.get(sessionId);
      } catch (error) {
        console.error("❌ Failed to get session:", error);
        throw error;
      }
    },
  };
}

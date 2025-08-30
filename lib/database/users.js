export function createUserRepository(db) {
  return {
    async create(email) {
      try {
        const stmt = db.prepare(`
          INSERT INTO users (email) 
          VALUES (?) 
          RETURNING id, email, created_at
        `);

        const user = stmt.get(email);
        console.log(`👤 User created: ${email} (ID: ${user.id})`);
        return user;
      } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
          throw new Error(`User with email ${email} already exists`);
        }
        console.error("❌ Failed to create user:", error);
        throw error;
      }
    },

    async getByEmail(email) {
      try {
        const stmt = db.prepare(`
          SELECT id, email, created_at, last_login_at 
          FROM users 
          WHERE email = ?
        `);

        return stmt.get(email);
      } catch (error) {
        console.error("❌ Failed to get user by email:", error);
        throw error;
      }
    },

    async getById(id) {
      try {
        const stmt = db.prepare(`
          SELECT id, email, created_at, last_login_at 
          FROM users 
          WHERE id = ?
        `);

        return stmt.get(id);
      } catch (error) {
        console.error("❌ Failed to get user by ID:", error);
        throw error;
      }
    },

    async updateLastLogin(userId) {
      try {
        const stmt = db.prepare(`
          UPDATE users 
          SET last_login_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `);

        const result = stmt.run(userId);

        if (result.changes === 0) {
          throw new Error(`User with ID ${userId} not found`);
        }

        console.log(`👤 Updated last login for user ID: ${userId}`);
        return result;
      } catch (error) {
        console.error("❌ Failed to update last login:", error);
        throw error;
      }
    },
  };
}

import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export class AppDatabase {
  constructor(dbPath = process.env.DATABASE_PATH || "./app.db") {
    this.dbPath = dbPath;
    this.db = null;
  }

  async connect() {
    try {
      // Connect to existing database
      this.db = new Database(this.dbPath);

      // Verify database exists and is properly initialized
      const needsInit = await this.needsInitialization();
      if (needsInit) {
        throw new Error(
          `App database not found or not initialized at ${this.dbPath}. Run 'make setup-db' first.`,
        );
      }

      console.log(`📁 App database connected at ${this.dbPath}`);
      return this.db;
    } catch (error) {
      console.error("❌ Failed to connect to app database:", error);
      throw error;
    }
  }

  async initialize() {
    try {
      // Create database connection (creates file if it doesn't exist)
      this.db = new Database(this.dbPath);

      // Check if database needs initialization
      const needsInit = await this.needsInitialization();

      if (needsInit) {
        await this.runSchema();
        console.log(`📁 App database initialized at ${this.dbPath}`);
      } else {
        console.log(`📁 App database already initialized at ${this.dbPath}`);
      }

      return this.db;
    } catch (error) {
      console.error("❌ Failed to initialize app database:", error);
      throw error;
    }
  }

  async needsInitialization() {
    try {
      // Check if users table exists
      const result = this.db
        .prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='users'
      `)
        .get();

      return !result;
    } catch (error) {
      console.error("Error checking database initialization:", error);
      return true; // Assume needs init if we can't check
    }
  }

  async runSchema() {
    try {
      // Load schema SQL file
      const schemaPath = join(__dirname, "schemas", "app-database.sql");
      const schemaSql = readFileSync(schemaPath, "utf8");

      // Execute schema (multiple statements)
      this.db.exec(schemaSql);

      console.log("✅ Database schema applied successfully");
    } catch (error) {
      console.error("❌ Failed to apply database schema:", error);
      throw error;
    }
  }

  async disconnect() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // User management methods
  async createUser(email) {
    try {
      const stmt = this.db.prepare(`
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
  }

  async getUserByEmail(email) {
    try {
      const stmt = this.db.prepare(`
        SELECT id, email, created_at, last_login_at 
        FROM users 
        WHERE email = ?
      `);

      return stmt.get(email);
    } catch (error) {
      console.error("❌ Failed to get user by email:", error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const stmt = this.db.prepare(`
        SELECT id, email, created_at, last_login_at 
        FROM users 
        WHERE id = ?
      `);

      return stmt.get(id);
    } catch (error) {
      console.error("❌ Failed to get user by ID:", error);
      throw error;
    }
  }

  async updateLastLogin(userId) {
    try {
      const stmt = this.db.prepare(`
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
  }

  // Token management methods (for future phases)
  // Note: token must be cryptographically secure (crypto.randomBytes(32).toString('hex'))
  async createAuthToken(userId, token, expiresAt) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO auth_tokens (user_id, token, expires_at) 
        VALUES (?, ?, ?)
        RETURNING id, token, expires_at
      `);

      return stmt.get(userId, token, expiresAt);
    } catch (error) {
      console.error("❌ Failed to create auth token:", error);
      throw error;
    }
  }

  async getAuthToken(token) {
    try {
      const stmt = this.db.prepare(`
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
  }

  // Session management methods (for future phases)
  // Note: sessionId must be cryptographically secure (crypto.randomBytes(32).toString('hex'))
  async createSession(sessionId, userId, expiresAt) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO sessions (id, user_id, expires_at) 
        VALUES (?, ?, ?)
        RETURNING id, user_id, expires_at
      `);

      return stmt.get(sessionId, userId, expiresAt);
    } catch (error) {
      console.error("❌ Failed to create session:", error);
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      const stmt = this.db.prepare(`
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
  }

  // Database health check
  async healthCheck() {
    try {
      // Simple query to test database connectivity
      const result = this.db.prepare("SELECT 1 as test").get();
      return result && result.test === 1;
    } catch (error) {
      console.error("❌ Database health check failed:", error);
      return false;
    }
  }
}

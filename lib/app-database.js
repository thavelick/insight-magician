import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAuthTokenRepository } from "./database/auth-tokens.js";
import { createSessionRepository } from "./database/sessions.js";
import { createUserRepository } from "./database/users.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export class AppDatabase {
  constructor(dbPath = process.env.DATABASE_PATH || "./app.db") {
    this.dbPath = dbPath;
    this.db = null;
    this.users = null;
    this.sessions = null;
    this.authTokens = null;
  }

  async connect() {
    try {
      this.db = new Database(this.dbPath);

      this.users = createUserRepository(this.db);
      this.sessions = createSessionRepository(this.db);
      this.authTokens = createAuthTokenRepository(this.db);

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
      this.db = new Database(this.dbPath);

      this.users = createUserRepository(this.db);
      this.sessions = createSessionRepository(this.db);
      this.authTokens = createAuthTokenRepository(this.db);

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
      const schemaPath = join(__dirname, "schemas", "app-database.sql");
      const schemaSql = readFileSync(schemaPath, "utf8");

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
      this.users = null;
      this.sessions = null;
      this.authTokens = null;
    }
  }

  async healthCheck() {
    try {
      const result = this.db.prepare("SELECT 1 as test").get();
      return result && result.test === 1;
    } catch (error) {
      console.error("❌ Database health check failed:", error);
      return false;
    }
  }
}

import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAuthTokenRepository } from "./database/auth-tokens.js";
import { createSessionRepository } from "./database/sessions.js";
import { createUserRepository } from "./database/users.js";

import { logger } from "./logger.js";
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
      this._connectToDatabase();

      const needsInit = await this.needsInitialization();
      if (needsInit) {
        throw new Error(
          `App database not found or not initialized at ${this.dbPath}. Run 'make setup-db' first.`,
        );
      }

      return this.db;
    } catch (error) {
      logger.error("❌ Failed to connect to app database:", error);
      throw error;
    }
  }

  async initialize() {
    try {
      this._connectToDatabase();

      const needsInit = await this.needsInitialization();

      if (!needsInit) return this.db;

      await this.runSchema();

      return this.db;
    } catch (error) {
      logger.error("❌ Failed to initialize app database:", error);
      throw error;
    }
  }

  _connectToDatabase() {
    this.db = new Database(this.dbPath);

    // Configure production SQLite pragmas
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA synchronous = NORMAL");
    this.db.exec("PRAGMA cache_size = 10000");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec("PRAGMA temp_store = memory");
    this.db.exec("PRAGMA busy_timeout = 5000");

    this.users = createUserRepository(this.db);
    this.sessions = createSessionRepository(this.db);
    this.authTokens = createAuthTokenRepository(this.db);
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
      logger.error("Error checking database initialization:", error);
      return true; // Assume needs init if we can't check
    }
  }

  async runSchema() {
    try {
      const schemaPath = join(__dirname, "schemas", "app-database.sql");
      const schemaSql = readFileSync(schemaPath, "utf8");

      this.db.exec(schemaSql);
    } catch (error) {
      logger.error("❌ Failed to apply database schema:", error);
      throw error;
    }
  }

  async disconnect() {
    if (!this.db) return;

    this.db.close();
    this.db = null;
    this.users = null;
    this.sessions = null;
    this.authTokens = null;
  }

  async healthCheck() {
    try {
      const result = this.db.prepare("SELECT 1 as test").get();
      return result && result.test === 1;
    } catch (error) {
      logger.error("❌ Database health check failed:", error);
      return false;
    }
  }
}

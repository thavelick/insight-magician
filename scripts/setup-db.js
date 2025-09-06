#!/usr/bin/env bun
import { AppDatabase } from "../lib/app-database.js";
import { logger } from "../lib/logger.js";

async function setupDatabase() {
  logger.debug("🔧 Setting up app database...");

  try {
    const appDb = new AppDatabase();
    await appDb.initialize();
    await appDb.disconnect();

    logger.debug("✅ App database setup complete!");
    logger.debug("   You can now start the server with: make dev");
  } catch (error) {
    logger.error("❌ Database setup failed:", error);
    process.exit(1);
  }
}

setupDatabase();

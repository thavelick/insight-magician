#!/usr/bin/env bun
import { AppDatabase } from "../lib/app-database.js";

async function setupDatabase() {
  console.log("🔧 Setting up app database...");

  try {
    const appDb = new AppDatabase();
    await appDb.initialize();
    await appDb.disconnect();

    console.log("✅ App database setup complete!");
    console.log("   You can now start the server with: make dev");
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    process.exit(1);
  }
}

setupDatabase();

import { Database } from "bun:sqlite";
import { join } from "node:path";

export class DatabaseManager {
  constructor(filePath) {
    this.filePath = filePath;
    this.db = null;
  }

  async connect() {
    if (!this.db) {
      this.db = new Database(this.filePath, { readonly: true });
    }
    return this.db;
  }

  async disconnect() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async getSchema() {
    await this.connect();

    // Get all tables
    const tablesQuery = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'",
    );
    const tables = tablesQuery.all();

    const schema = {};

    for (const table of tables) {
      // Get columns for each table (properly quote table names)
      const columnsQuery = this.db.prepare(`PRAGMA table_info("${table.name}")`);
      const columns = columnsQuery.all();

      // Get sample data count (properly quote table names)
      const countQuery = this.db.prepare(
        `SELECT COUNT(*) as count FROM "${table.name}"`,
      );
      const { count } = countQuery.get();

      schema[table.name] = {
        columns: columns.map((col) => ({
          name: col.name,
          type: col.type,
          nullable: !col.notnull,
          primaryKey: !!col.pk,
          defaultValue: col.dflt_value,
        })),
        rowCount: count,
      };
    }

    return schema;
  }

  async executeQuery(sql, params = []) {
    await this.connect();

    // Basic validation - only allow SELECT statements
    const trimmedSql = sql.trim().toLowerCase();
    if (!trimmedSql.startsWith("select")) {
      throw new Error("Only SELECT queries are allowed");
    }

    try {
      const query = this.db.prepare(sql);
      const results = query.all(...params);
      return results;
    } catch (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }
}

export function validateSqliteFile(buffer) {
  // SQLite files start with "SQLite format 3\0"
  const sqliteHeader = Buffer.from("SQLite format 3\0", "utf8");

  if (buffer.length < sqliteHeader.length) {
    return false;
  }

  return buffer.subarray(0, sqliteHeader.length).equals(sqliteHeader);
}

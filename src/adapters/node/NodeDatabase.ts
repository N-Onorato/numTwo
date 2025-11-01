import Database from "better-sqlite3";
import type { IDatabase } from "../../core/interfaces/IDatabase.js";
import type { IStatement } from "../../core/interfaces/IStatement.js";

/**
 * Wrapper for better-sqlite3 prepared statements
 */
class NodeStatement<T = any> implements IStatement<T> {
  constructor(private stmt: Database.Statement) {}

  get(...params: any[]): T | undefined {
    return this.stmt.get(...params) as T | undefined;
  }

  all(...params: any[]): T[] {
    return this.stmt.all(...params) as T[];
  }

  run(...params: any[]): void {
    this.stmt.run(...params);
  }

  finalize(): void {
    // better-sqlite3 doesn't require explicit finalization
    // Statements are automatically cleaned up
  }
}

/**
 * Node.js adapter for SQLite database using better-sqlite3
 * Wraps the better-sqlite3 driver to implement IDatabase interface
 */
export class NodeDatabase implements IDatabase {
  private db: Database.Database;

  constructor(pathOrDatabase: string | Database.Database) {
    if (typeof pathOrDatabase === "string") {
      this.db = new Database(pathOrDatabase);
    } else {
      this.db = pathOrDatabase;
    }
  }

  exec(sql: string, ...params: any[]): void {
    if (params.length > 0) {
      this.db.prepare(sql).run(...params);
    } else {
      this.db.exec(sql);
    }
  }

  prepare<T = any>(sql: string): IStatement<T> {
    const stmt = this.db.prepare(sql);
    return new NodeStatement<T>(stmt);
  }

  transaction<T>(fn: () => T): T {
    // better-sqlite3 has native transaction support
    const txn = this.db.transaction(fn);
    return txn();
  }

  close(): void {
    this.db.close();
  }

  /**
   * Get the underlying better-sqlite3 Database instance
   * Useful for advanced operations not covered by IDatabase
   */
  get underlying(): Database.Database {
    return this.db;
  }
}

/**
 * Create a Node.js database instance
 * @param path - Path to the database file, or ":memory:" for in-memory database
 * @returns A new NodeDatabase instance
 */
export function createNodeDatabase(path: string): NodeDatabase {
  return new NodeDatabase(path);
}

/**
 * Create an in-memory test database for Node.js
 * @returns A new NodeDatabase instance using in-memory storage
 */
export function createNodeTestDatabase(): NodeDatabase {
  return new NodeDatabase(":memory:");
}

import { Database } from "@db/sqlite3";
import type { IDatabase } from "../../core/interfaces/IDatabase.js";
import type { IStatement } from "../../core/interfaces/IStatement.js";

/**
 * Wrapper for Deno SQLite3 prepared statements
 */
class DenoStatement<T = any> implements IStatement<T> {
  constructor(private stmt: any) {}

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
    this.stmt.finalize();
  }
}

/**
 * Deno adapter for SQLite database
 * Wraps the Deno SQLite3 driver to implement IDatabase interface
 */
export class DenoDatabase implements IDatabase {
  private db: Database;
  private inTransaction = false;

  constructor(pathOrDatabase: string | Database) {
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
    return new DenoStatement<T>(stmt);
  }

  transaction<T>(fn: () => T): T {
    if (this.inTransaction) {
      // Already in a transaction, just execute the function
      return fn();
    }

    this.inTransaction = true;
    this.exec("BEGIN TRANSACTION");

    try {
      const result = fn();
      this.exec("COMMIT");
      this.inTransaction = false;
      return result;
    } catch (error) {
      this.exec("ROLLBACK");
      this.inTransaction = false;
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }

  /**
   * Get the underlying Deno Database instance
   * Useful for advanced operations not covered by IDatabase
   */
  get underlying(): Database {
    return this.db;
  }
}

/**
 * Create a Deno database instance
 * @param path - Path to the database file, or ":memory:" for in-memory database
 * @returns A new DenoDatabase instance
 */
export function createDenoDatabase(path: string): DenoDatabase {
  return new DenoDatabase(path);
}

/**
 * Create an in-memory test database for Deno
 * @returns A new DenoDatabase instance using in-memory storage
 */
export function createDenoTestDatabase(): DenoDatabase {
  return new DenoDatabase(":memory:");
}

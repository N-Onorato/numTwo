import type { IDatabase } from "./interfaces/IDatabase.js";

/**
 * Execute a schema definition against a database
 * This is a utility function for applying SQL schema definitions
 * @param db - The database instance
 * @param schemaSQL - SQL statements to execute (can be multiple statements separated by semicolons)
 */
export function applySchema(db: IDatabase, schemaSQL: string): void {
  try {
    // Split on semicolons but keep them for individual exec calls
    const statements = schemaSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      db.exec(statement);
    }
  } catch (error) {
    console.error("Error applying database schema:", error);
    throw error;
  }
}

/**
 * Ensure the migrations table exists
 * This table is used by the migration system to track applied migrations
 * @param db - The database instance
 */
export function ensureMigrationsTable(db: IDatabase): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      applied_at TEXT NOT NULL
    )`
  );
}

/**
 * Schema definition helper
 * Provides a fluent API for building schema definitions
 */
export class SchemaBuilder {
  private statements: string[] = [];

  /**
   * Add a table creation statement
   * @param sql - The CREATE TABLE statement
   */
  table(sql: string): this {
    this.statements.push(sql);
    return this;
  }

  /**
   * Add an index creation statement
   * @param sql - The CREATE INDEX statement
   */
  index(sql: string): this {
    this.statements.push(sql);
    return this;
  }

  /**
   * Add a raw SQL statement
   * @param sql - The SQL statement
   */
  raw(sql: string): this {
    this.statements.push(sql);
    return this;
  }

  /**
   * Build the schema SQL string
   * @returns The complete schema SQL
   */
  build(): string {
    return this.statements.join(";\n") + ";";
  }

  /**
   * Apply the schema to a database
   * @param db - The database instance
   */
  apply(db: IDatabase): void {
    applySchema(db, this.build());
  }
}

/**
 * Create a new schema builder
 * @returns A new SchemaBuilder instance
 */
export function createSchema(): SchemaBuilder {
  return new SchemaBuilder();
}

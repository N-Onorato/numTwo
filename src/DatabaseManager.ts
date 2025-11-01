import type { IDatabase } from "./core/interfaces/IDatabase.js";
import type { IFileSystem } from "./core/interfaces/IFileSystem.js";
import { MigrationManager } from "./core/migrations/MigrationManager.js";
import { applySchema, ensureMigrationsTable } from "./core/schema.js";

/**
 * Main database manager class
 * Provides a unified interface for database operations, schema management, and migrations
 */
export class DatabaseManager {
  private db: IDatabase;
  private migrationManager?: MigrationManager;

  constructor(db: IDatabase) {
    this.db = db;
  }

  /**
   * Initialize a migration manager for this database
   * @param fs - File system adapter for reading migration files
   * @param options - Migration manager options
   */
  initializeMigrations(
    fs: IFileSystem,
    options: {
      migrationsPath?: string;
      yamlParser: (content: string) => any;
    }
  ): void {
    this.migrationManager = new MigrationManager(this.db, fs, options);
  }

  /**
   * Apply a schema to the database
   * @param schemaSQL - SQL statements to execute
   */
  applySchema(schemaSQL: string): void {
    applySchema(this.db, schemaSQL);
  }

  /**
   * Ensure the migrations table exists
   */
  ensureMigrationsTable(): void {
    ensureMigrationsTable(this.db);
  }

  /**
   * Get the current migration version
   * Requires migrations to be initialized first
   */
  getCurrentVersion(): number {
    if (!this.migrationManager) {
      throw new Error(
        "Migration manager not initialized. Call initializeMigrations() first."
      );
    }
    return this.migrationManager.getCurrentVersion();
  }

  /**
   * Get the latest available migration version
   * Requires migrations to be initialized first
   */
  async getLatestVersion(): Promise<number> {
    if (!this.migrationManager) {
      throw new Error(
        "Migration manager not initialized. Call initializeMigrations() first."
      );
    }
    return await this.migrationManager.getLatestVersion();
  }

  /**
   * Migrate to a specific version or latest
   * Requires migrations to be initialized first
   * @param targetVersion - Target version number or "latest"
   */
  async migrateTo(targetVersion: number | "latest"): Promise<void> {
    if (!this.migrationManager) {
      throw new Error(
        "Migration manager not initialized. Call initializeMigrations() first."
      );
    }
    await this.migrationManager.migrateTo(targetVersion);
  }

  /**
   * Show migration status
   * Requires migrations to be initialized first
   */
  async showMigrationStatus(): Promise<void> {
    if (!this.migrationManager) {
      throw new Error(
        "Migration manager not initialized. Call initializeMigrations() first."
      );
    }
    await this.migrationManager.showStatus();
  }

  /**
   * Execute a function within a transaction
   * @param fn - Function to execute
   * @returns The return value of the function
   */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn);
  }

  /**
   * Get the underlying database instance for direct access
   */
  get database(): IDatabase {
    return this.db;
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}

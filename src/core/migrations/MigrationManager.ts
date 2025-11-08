import type { IDatabase } from "../interfaces/IDatabase.js";
import type { IFileSystem } from "../interfaces/IFileSystem.js";

export interface Migration {
  version: number;
  name: string;
  description: string;
  reversible: boolean;
  up: string | { file: string };
  down: string | { file: string } | null;
}

export interface MigrationsFile {
  migrations: Migration[];
}

/**
 * Migration manager for handling database schema changes
 * Works with any runtime via IDatabase and IFileSystem interfaces
 */
export class MigrationManager {
  private db: IDatabase;
  private fs: IFileSystem;
  private migrationsPath: string;
  private yamlParser: (content: string) => any;

  constructor(
    db: IDatabase,
    fs: IFileSystem,
    options: {
      migrationsPath?: string;
      yamlParser: (content: string) => any;
    }
  ) {
    this.db = db;
    this.fs = fs;
    this.migrationsPath = options.migrationsPath || "./migrations.yaml";
    this.yamlParser = options.yamlParser;
    this.ensureMigrationsTable();
  }

  /**
   * Ensures the migrations tracking table exists
   */
  private ensureMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        applied_at TEXT NOT NULL
      )
    `);
  }

  /**
   * Gets the current database version
   */
  getCurrentVersion(): number {
    const result = this.db.prepare<{ version: number | null }>(
      "SELECT MAX(version) as version FROM migrations"
    ).get();
    return result?.version ?? 0;
  }

  /**
   * Resolves SQL content from either inline string or file reference
   */
  private async resolveSql(
    sql: string | { file: string } | null,
    migrationVersion: number,
    direction: "up" | "down"
  ): Promise<string | null> {
    if (sql === null) {
      return null;
    }

    if (typeof sql === "string") {
      // Inline SQL - return as is
      return sql;
    }

    // File reference - read from file
    try {
      const filePath = sql.file;
      const content = await this.fs.readTextFile(filePath);
      return content;
    } catch (error) {
      throw new Error(
        `Failed to load SQL file for migration ${migrationVersion} (${direction}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Validates that all file references in migrations exist
   */
  private async validateMigrationFiles(migrations: Migration[]): Promise<void> {
    for (const migration of migrations) {
      // Check up file reference
      if (typeof migration.up === "object" && migration.up.file) {
        try {
          await this.fs.readTextFile(migration.up.file);
        } catch (error) {
          throw new Error(
            `Migration ${migration.version} (${migration.name}): up file not found: ${migration.up.file}`
          );
        }
      }

      // Check down file reference
      if (
        migration.down &&
        typeof migration.down === "object" &&
        migration.down.file
      ) {
        try {
          await this.fs.readTextFile(migration.down.file);
        } catch (error) {
          throw new Error(
            `Migration ${migration.version} (${migration.name}): down file not found: ${migration.down.file}`
          );
        }
      }
    }
  }

  /**
   * Loads migrations from the YAML file
   */
  private async loadMigrations(): Promise<Migration[]> {
    try {
      const yamlContent = await this.fs.readTextFile(this.migrationsPath);
      const migrationsFile = this.yamlParser(yamlContent) as MigrationsFile;

      // Validate and sort migrations by version
      const migrations = migrationsFile.migrations.sort((a, b) =>
        a.version - b.version
      );

      // Validate version sequence
      for (let i = 0; i < migrations.length; i++) {
        if (migrations[i].version !== i + 1) {
          throw new Error(
            `Migration version sequence error: expected version ${i + 1}, got ${
              migrations[i].version
            }`
          );
        }
      }

      // Validate that all referenced files exist
      await this.validateMigrationFiles(migrations);

      return migrations;
    } catch (error) {
      throw new Error(
        `Failed to load migrations: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Gets the latest migration version available
   */
  async getLatestVersion(): Promise<number> {
    const migrations = await this.loadMigrations();
    return migrations.length > 0
      ? Math.max(...migrations.map((m) => m.version))
      : 0;
  }

  /**
   * Runs migrations to the specified target version
   */
  async migrateTo(targetVersion: number | "latest"): Promise<void> {
    const migrations = await this.loadMigrations();
    const currentVersion = this.getCurrentVersion();

    let actualTarget: number;
    if (targetVersion === "latest") {
      actualTarget = await this.getLatestVersion();
    } else {
      actualTarget = targetVersion;
    }

    console.log(`Current database version: ${currentVersion}`);
    console.log(`Target version: ${actualTarget}`);

    if (currentVersion === actualTarget) {
      console.log("Database is already at target version");
      return;
    }

    if (currentVersion < actualTarget) {
      // Run forward migrations
      await this.migrateUp(currentVersion, actualTarget, migrations);
    } else {
      // Run rollback migrations
      await this.migrateDown(currentVersion, actualTarget, migrations);
    }

    console.log(
      `Migration completed. Database is now at version ${actualTarget}`
    );
  }

  /**
   * Runs forward migrations from current to target version
   */
  private async migrateUp(
    currentVersion: number,
    targetVersion: number,
    migrations: Migration[]
  ): Promise<void> {
    console.log(
      `Running forward migrations from version ${currentVersion} to ${targetVersion}`
    );

    for (let version = currentVersion + 1; version <= targetVersion; version++) {
      const migration = migrations.find((m) => m.version === version);
      if (!migration) {
        throw new Error(`Migration version ${version} not found`);
      }

      console.log(`Applying migration ${version}: ${migration.name}`);

      try {
        // Resolve SQL content (inline or from file)
        const upSql = await this.resolveSql(migration.up, version, "up");
        if (!upSql) {
          throw new Error(`Migration ${version} has no up SQL defined`);
        }

        // Execute migration in a transaction
        this.db.transaction(() => {
          // Execute migration
          this.db.exec(upSql);

          // Record migration as applied
          this.db
            .prepare(
              "INSERT INTO migrations (version, name, description, applied_at) VALUES (?, ?, ?, ?)"
            )
            .run(
              version,
              migration.name,
              migration.description,
              Date.now().toString()
            );
        });

        console.log(`✓ Applied migration ${version}: ${migration.name}`);
      } catch (error) {
        throw new Error(
          `Failed to apply migration ${version}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  /**
   * Runs rollback migrations from current to target version
   */
  private async migrateDown(
    currentVersion: number,
    targetVersion: number,
    migrations: Migration[]
  ): Promise<void> {
    console.log(
      `Running rollback migrations from version ${currentVersion} to ${targetVersion}`
    );

    for (let version = currentVersion; version > targetVersion; version--) {
      const migration = migrations.find((m) => m.version === version);
      if (!migration) {
        throw new Error(`Migration version ${version} not found`);
      }

      if (!migration.reversible) {
        throw new Error(
          `Migration ${version} (${migration.name}) is not reversible. Cannot rollback.`
        );
      }

      if (!migration.down) {
        throw new Error(
          `Migration ${version} (${migration.name}) has no rollback script defined`
        );
      }

      console.log(`Rolling back migration ${version}: ${migration.name}`);

      try {
        // Resolve SQL content (inline or from file)
        const downSql = await this.resolveSql(migration.down, version, "down");
        if (!downSql) {
          throw new Error(`Migration ${version} has no down SQL defined`);
        }

        // Execute rollback in a transaction
        this.db.transaction(() => {
          // Execute rollback
          this.db.exec(downSql);

          // Remove migration record
          this.db
            .prepare("DELETE FROM migrations WHERE version = ?")
            .run(version);
        });

        console.log(`✓ Rolled back migration ${version}: ${migration.name}`);
      } catch (error) {
        throw new Error(
          `Failed to rollback migration ${version}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  /**
   * Shows the current migration status
   */
  async showStatus(): Promise<void> {
    const currentVersion = this.getCurrentVersion();
    const latestVersion = await this.getLatestVersion();

    console.log("Migration Status:");
    console.log(`Current version: ${currentVersion}`);
    console.log(`Latest available: ${latestVersion}`);

    if (currentVersion < latestVersion) {
      console.log(`⚠️  Database is behind. Run migrations to upgrade.`);
    } else if (currentVersion === latestVersion) {
      console.log(`✓ Database is up to date.`);
    }

    // Show applied migrations
    const appliedMigrations = this.db
      .prepare<{ version: number; name: string; applied_at: string }>(
        "SELECT version, name, applied_at FROM migrations ORDER BY version"
      )
      .all();

    if (appliedMigrations.length > 0) {
      console.log("\nApplied migrations:");
      appliedMigrations.forEach((migration) => {
        const appliedDate = new Date(parseInt(migration.applied_at));
        console.log(
          `  ${migration.version}: ${migration.name} (${appliedDate.toISOString()})`
        );
      });
    }
  }
}

#!/usr/bin/env node

import { parse as parseYaml } from "yaml";
import { DatabaseManager } from "../dist/DatabaseManager.js";
import { createNodeDatabase } from "../dist/adapters/node/NodeDatabase.js";
import { createNodeFileSystem } from "../dist/adapters/node/NodeFileSystem.js";

/**
 * Migration CLI for Node.js
 * Usage:
 *   node migrate.js                  # Migrate to latest
 *   node migrate.js --to <version>   # Migrate to specific version
 *   node migrate.js status           # Show migration status
 */

async function main() {
  const args = process.argv.slice(2);

  // Get database path from environment or use default
  const dbPath = process.env.DATABASE_PATH || "./app.db";
  const migrationsPath = process.env.MIGRATIONS_PATH || "./migrations.yaml";

  // Check if migrations should be skipped
  const migrationTarget = process.env.DATABASE_MIGRATION_TARGET;
  if (migrationTarget === "skip") {
    console.log("DATABASE_MIGRATION_TARGET=skip, skipping migrations");
    process.exit(0);
  }

  // Create database and manager
  const db = createNodeDatabase(dbPath);
  const fs = createNodeFileSystem();
  const manager = new DatabaseManager(db);

  // Initialize migrations
  manager.initializeMigrations(fs, {
    migrationsPath,
    yamlParser: parseYaml,
  });

  try {
    // Parse command
    if (args.length === 0 || args[0] === "latest") {
      // Migrate to latest
      const targetVersion = migrationTarget && migrationTarget !== "latest"
        ? parseInt(migrationTarget)
        : "latest";
      await manager.migrateTo(targetVersion);
    } else if (args[0] === "status") {
      // Show status
      await manager.showMigrationStatus();
    } else if (args[0] === "--to" && args.length > 1) {
      // Migrate to specific version
      const version = parseInt(args[1]);
      if (isNaN(version)) {
        console.error("Invalid version number");
        process.exit(1);
      }
      await manager.migrateTo(version);
    } else {
      // Unknown command
      console.error("Usage:");
      console.error("  migrate                  # Migrate to latest");
      console.error("  migrate --to <version>   # Migrate to specific version");
      console.error("  migrate status           # Show migration status");
      console.error("");
      console.error("Environment variables:");
      console.error("  DATABASE_PATH              # Path to database file (default: ./app.db)");
      console.error("  MIGRATIONS_PATH            # Path to migrations.yaml (default: ./migrations.yaml)");
      console.error("  DATABASE_MIGRATION_TARGET  # Target version or 'skip' (default: latest)");
      process.exit(1);
    }

    db.close();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error instanceof Error ? error.message : String(error));
    db.close();
    process.exit(1);
  }
}

main();

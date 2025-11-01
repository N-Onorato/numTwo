#!/usr/bin/env -S deno run -A

import { parse as parseYaml } from "@std/yaml";
import { DatabaseManager } from "../src/DatabaseManager.ts";
import { createDenoDatabase } from "../src/adapters/deno/DenoDatabase.ts";
import { createDenoFileSystem } from "../src/adapters/deno/DenoFileSystem.ts";

/**
 * Migration CLI for Deno
 * Usage:
 *   deno run -A migrate.deno.ts                  # Migrate to latest
 *   deno run -A migrate.deno.ts --to <version>   # Migrate to specific version
 *   deno run -A migrate.deno.ts status           # Show migration status
 */

async function main() {
  const args = Deno.args;

  // Get database path from environment or use default
  const dbPath = Deno.env.get("DATABASE_PATH") || "./app.db";
  const migrationsPath = Deno.env.get("MIGRATIONS_PATH") || "./migrations.yaml";

  // Check if migrations should be skipped
  const migrationTarget = Deno.env.get("DATABASE_MIGRATION_TARGET");
  if (migrationTarget === "skip") {
    console.log("DATABASE_MIGRATION_TARGET=skip, skipping migrations");
    Deno.exit(0);
  }

  // Create database and manager
  const db = createDenoDatabase(dbPath);
  const fs = createDenoFileSystem();
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
        Deno.exit(1);
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
      Deno.exit(1);
    }

    db.close();
    Deno.exit(0);
  } catch (error) {
    console.error("Migration failed:", error instanceof Error ? error.message : String(error));
    db.close();
    Deno.exit(1);
  }
}

main();

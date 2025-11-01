/**
 * numTwo - Deno entry point
 * Framework-agnostic database infrastructure with schema management, migrations, and transaction support
 * Like a #2 pencil - flexible, reliable, and perfect for small projects
 */

// Core interfaces
export type { IDatabase } from "./core/interfaces/IDatabase.ts";
export type { IStatement } from "./core/interfaces/IStatement.ts";
export type { IFileSystem } from "./core/interfaces/IFileSystem.ts";

// Schema utilities
export {
  applySchema,
  ensureMigrationsTable,
  SchemaBuilder,
  createSchema,
} from "./core/schema.ts";

// Migration system
export {
  MigrationManager,
  type Migration,
  type MigrationsFile,
} from "./core/migrations/MigrationManager.ts";

// Main manager
export { DatabaseManager } from "./DatabaseManager.ts";

// Deno adapters
export {
  DenoDatabase,
  createDenoDatabase,
  createDenoTestDatabase,
} from "./adapters/deno/DenoDatabase.ts";
export {
  DenoFileSystem,
  createDenoFileSystem,
} from "./adapters/deno/DenoFileSystem.ts";

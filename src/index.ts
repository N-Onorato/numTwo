/**
 * numTwo - Node.js entry point
 * Framework-agnostic database infrastructure with schema management, migrations, and transaction support
 * Like a #2 pencil - flexible, reliable, and perfect for small projects
 */

// Core interfaces
export type { IDatabase } from "./core/interfaces/IDatabase.js";
export type { IStatement } from "./core/interfaces/IStatement.js";
export type { IFileSystem } from "./core/interfaces/IFileSystem.js";

// Schema utilities
export {
  applySchema,
  ensureMigrationsTable,
  SchemaBuilder,
  createSchema,
} from "./core/schema.js";

// Migration system
export {
  MigrationManager,
  type Migration,
  type MigrationsFile,
} from "./core/migrations/MigrationManager.js";

// Main manager
export { DatabaseManager } from "./DatabaseManager.js";

// Node.js adapters
export {
  NodeDatabase,
  createNodeDatabase,
  createNodeTestDatabase,
} from "./adapters/node/NodeDatabase.js";
export {
  NodeFileSystem,
  createNodeFileSystem,
} from "./adapters/node/NodeFileSystem.js";

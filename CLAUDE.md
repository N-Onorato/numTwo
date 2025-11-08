# numTwo - Claude AI Understanding

## Purpose

numTwo is a framework-agnostic database infrastructure package for SQLite databases. It provides:

- **Schema Management**: Apply SQL schemas programmatically with validation
- **Migration System**: YAML-based migration definitions with version tracking and rollback support
- **Transaction Support**: Built-in atomic transaction handling
- **Cross-Runtime Compatibility**: Works seamlessly with both Deno and Node.js

The tool is designed to be "like a #2 pencil - flexible, reliable, and perfect for small projects."

## Core Architecture

### Layered Design

```
numTwo/
├── core/                          # Framework-agnostic core logic
│   ├── interfaces/                # Runtime abstractions
│   │   ├── IDatabase.ts          # Database operations interface
│   │   ├── IStatement.ts         # Prepared statement interface
│   │   └── IFileSystem.ts        # File operations interface
│   ├── schema.ts                 # Schema builder and utilities
│   └── migrations/
│       └── MigrationManager.ts   # Migration engine
├── adapters/                      # Runtime-specific implementations
│   ├── node/
│   │   ├── NodeDatabase.ts       # better-sqlite3 adapter
│   │   └── NodeFileSystem.ts     # Node.js fs adapter
│   └── deno/
│       ├── DenoDatabase.ts       # @db/sqlite3 adapter
│       └── DenoFileSystem.ts     # Deno.readTextFile adapter
├── DatabaseManager.ts             # Unified API facade
├── cli/                          # Migration CLI tools
│   ├── migrate.ts                # Node.js CLI
│   └── migrate.deno.ts           # Deno CLI
└── mod.ts                        # Package exports

```

### Key Design Patterns

1. **Interface Abstraction**: Core logic depends on interfaces (IDatabase, IFileSystem), not concrete implementations
2. **Adapter Pattern**: Runtime-specific adapters implement core interfaces
3. **Facade Pattern**: DatabaseManager provides simplified API over complex subsystems
4. **Transaction Pattern**: Automatic rollback on errors, explicit commit on success

## Essential Files

### Core Interfaces

**`src/core/interfaces/IDatabase.ts`**
- Defines database operations contract
- Methods: `exec()`, `prepare()`, `transaction()`, `close()`
- Generic type support for typed queries

**`src/core/interfaces/IFileSystem.ts`**
- Abstracts file I/O operations
- Method: `readTextFile(path: string): Promise<string>`

### Migration System

**`src/core/migrations/MigrationManager.ts`** (Lines: ~330)
Core migration engine with:
- Migration loading from YAML (with validation)
- Version tracking in SQLite `migrations` table
- Forward migrations (`migrateUp()`)
- Rollback migrations (`migrateDown()`)
- File reference support for large SQL migrations
- Transactional execution

Key Methods:
- `loadMigrations()`: Parses YAML, validates version sequence, validates file references
- `migrateTo(target)`: Orchestrates migration to target version
- `migrateUp()`: Applies forward migrations in sequence
- `migrateDown()`: Rolls back migrations in reverse sequence
- `resolveSql()`: Loads SQL from inline string or file reference
- `validateMigrationFiles()`: Ensures all referenced SQL files exist

**`src/DatabaseManager.ts`**
Unified API that wraps:
- Schema management (`applySchema()`)
- Migration operations (`migrateTo()`, `showMigrationStatus()`)
- Transaction support (`transaction()`)
- Direct database access

### Adapters

**Node.js Adapter (`src/adapters/node/NodeDatabase.ts`)**
- Uses `better-sqlite3` package
- Implements transaction support via `better-sqlite3` API
- Prepared statement caching

**Deno Adapter (`src/adapters/deno/DenoDatabase.ts`)**
- Uses `@db/sqlite3` package
- Implements manual transaction management (BEGIN/COMMIT/ROLLBACK)
- Prepared statement handling

### CLI Tools

**`cli/migrate.ts`** (Node.js)
**`cli/migrate.deno.ts`** (Deno)

Both provide:
- `migrate` (default): Run to latest or specified version
- `migrate status`: Show current and latest version
- Environment variables: `DATABASE_PATH`, `MIGRATIONS_PATH`, `DATABASE_MIGRATION_TARGET`

## Migration System Deep Dive

### YAML Schema

Migrations are defined in `migrations.yaml`:

```yaml
migrations:
  - version: 1              # Sequential integer (1, 2, 3...)
    name: string            # Short description
    description: string     # Detailed description
    reversible: boolean     # Whether rollback is supported
    up: string | { file: string }    # Forward migration SQL
    down: string | { file: string } | null  # Rollback SQL
```

### File Reference Support (NEW)

Migrations can now reference external SQL files:

**Inline SQL:**
```yaml
up: |
  CREATE TABLE users (id TEXT PRIMARY KEY);
```

**File Reference:**
```yaml
up:
  file: "migrations/001_create_users.sql"
```

**Mixed:**
```yaml
migrations:
  - version: 1
    up: "CREATE TABLE users (...);"
    down: "DROP TABLE users;"
  - version: 2
    up: { file: "migrations/002_seed.sql" }
    down: null
```

### Migration Workflow

1. **Load**: Parse YAML → Validate version sequence → Validate file references exist
2. **Plan**: Determine current version → Calculate migration path (up or down)
3. **Execute**: For each migration in sequence:
   - Resolve SQL (inline or from file)
   - Begin transaction
   - Execute SQL via `db.exec()`
   - Record/remove version in `migrations` table
   - Commit transaction
4. **Rollback**: On any error, transaction auto-rollbacks, leaving database unchanged

### Version Tracking

Table: `migrations`
```sql
CREATE TABLE migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  applied_at TEXT NOT NULL  -- stored as string timestamp
);
```

Current version: `SELECT MAX(version) FROM migrations`

## Common Patterns

### 1. Initialize Database

```typescript
import { DatabaseManager, createNodeDatabase, createNodeFileSystem } from 'numtwo';
import { parse as parseYaml } from 'yaml';

const db = createNodeDatabase('./app.db');
const manager = new DatabaseManager(db);

// Apply initial schema
manager.applySchema(`
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY);
`);

// Setup migrations
const fs = createNodeFileSystem();
manager.initializeMigrations(fs, {
  migrationsPath: './migrations.yaml',
  yamlParser: parseYaml
});

await manager.migrateTo('latest');
```

### 2. Use Transactions

```typescript
// Atomic multi-statement operation
manager.transaction(() => {
  const stmt = manager.database.prepare('INSERT INTO users VALUES (?, ?)');
  stmt.run('1', 'Alice');
  stmt.run('2', 'Bob');
  // Auto-commits on success, auto-rollbacks on error
});
```

### 3. Query Data

```typescript
// Single row
const user = manager.database
  .prepare('SELECT * FROM users WHERE id = ?')
  .get('1');

// Multiple rows
const users = manager.database
  .prepare('SELECT * FROM users')
  .all();
```

### 4. Testing with In-Memory Database

```typescript
import { createNodeTestDatabase } from 'numtwo';

const testDb = createNodeTestDatabase();
const manager = new DatabaseManager(testDb);
// ... run tests
```

## Best Practices

### Migrations

- Keep migrations small and focused (single purpose)
- Use file references for migrations > 50 lines of SQL
- Always provide `down` scripts when reversible
- Never skip version numbers (must be 1, 2, 3, ...)
- Test migrations on production data copies
- Name files descriptively: `001_create_users.sql`, `002_add_indexes.sql`

### File Organization

```
project/
├── migrations.yaml
├── migrations/
│   ├── 001_create_users_up.sql
│   ├── 001_create_users_down.sql
│   ├── 002_seed_data_up.sql
│   └── ...
├── app.db
└── src/
```

### Date Storage

SQLite INTEGER can overflow with `Date.now()`. Always use TEXT:

```typescript
// Good
const timestamp = Date.now().toString();
db.exec('INSERT INTO table (created_at) VALUES (?)', timestamp);

// Bad (can overflow)
db.exec('INSERT INTO table (created_at) VALUES (?)', Date.now());
```

### Transactions

- Wrap multi-statement operations in transactions
- Keep transactions short (no I/O, network calls)
- Let errors throw to trigger automatic rollback
- Don't catch errors inside transactions unless rethrowing

## Environment Variables

- `DATABASE_PATH`: Database file path (default: `./app.db`)
- `MIGRATIONS_PATH`: Migrations YAML path (default: `./migrations.yaml`)
- `DATABASE_MIGRATION_TARGET`: Target version, `latest`, or `skip` (default: `latest`)

## Dependencies

### Node.js
- `better-sqlite3`: SQLite driver
- `yaml`: YAML parser
- `nanoid`: ID generation (optional)

### Deno
- `@db/sqlite3`: SQLite driver (JSR)
- `@std/yaml`: YAML parser
- Built-in APIs: `Deno.readTextFile()`, `Deno.writeTextFile()`

## Testing

Run tests with in-memory databases:

```typescript
const testDb = createNodeTestDatabase(); // or createDenoTestDatabase()
const manager = new DatabaseManager(testDb);
manager.applySchema(schema);
// ... test operations
manager.close();
```

## Recent Changes

### File Reference Support for Migrations

Added ability to reference external SQL files in migrations.yaml:

- **Migration Interface**: Updated `up` and `down` to support `string | { file: string }`
- **MigrationManager**: Added `resolveSql()` method to load SQL from files
- **Validation**: Added `validateMigrationFiles()` to ensure all referenced files exist
- **Async Operations**: Updated `migrateUp()` and `migrateDown()` to be async

Benefits:
- Keeps migrations.yaml concise and readable
- Better organization for complex migrations
- SQL syntax highlighting in separate .sql files
- Easier code review for large schema changes

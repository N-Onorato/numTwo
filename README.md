# numTwo

Framework-agnostic database infrastructure package providing schema management, migrations, and transaction support for SQLite databases. Works seamlessly with both Deno and Node.js runtimes.

Like a #2 pencil - flexible, reliable, and perfect for small projects.

## Features

- **Framework-Agnostic**: Works with Deno, Node.js, Next.js, Fresh, and any other JavaScript runtime
- **Transaction Support**: Built-in transaction handling for atomic operations
- **Migration System**: YAML-based migration definitions with version tracking and rollback support
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Minimal Dependencies**: Uses SQLite directly - no ORM overhead
- **Test-Friendly**: In-memory database support for testing
- **CLI Included**: Cross-runtime migration command-line tool

## Installation

### For Node.js / Next.js Projects

```bash
npm install numtwo better-sqlite3 yaml nanoid
```

### For Deno / Fresh Projects

Add to your `deno.json` imports:

```json
{
  "imports": {
    "numtwo": "jsr:@numtwo/numtwo"
  }
}
```

Or import directly:

```typescript
import { ... } from "https://deno.land/x/numtwo/mod.ts";
```

## Quick Start

### Node.js / Next.js

```typescript
import {
  DatabaseManager,
  createNodeDatabase,
  createNodeFileSystem,
  applySchema,
} from 'numtwo';
import { parse as parseYaml } from 'yaml';

// Create database
const db = createNodeDatabase('./app.db');
const manager = new DatabaseManager(db);

// Apply schema
const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  );
`;
manager.applySchema(schema);

// Initialize migrations
const fs = createNodeFileSystem();
manager.initializeMigrations(fs, {
  migrationsPath: './migrations.yaml',
  yamlParser: parseYaml,
});

// Run migrations
await manager.migrateTo('latest');

// Use transactions
manager.transaction(() => {
  const stmt = manager.database.prepare(
    'INSERT INTO users (id, name, email) VALUES (?, ?, ?)'
  );
  stmt.run('1', 'Alice', 'alice@example.com');
  stmt.run('2', 'Bob', 'bob@example.com');
});

// Close when done
manager.close();
```

### Deno / Fresh

```typescript
import {
  DatabaseManager,
  createDenoDatabase,
  createDenoFileSystem,
  applySchema,
} from 'numtwo';
import { parse as parseYaml } from '@std/yaml';

// Create database
const db = createDenoDatabase('./app.db');
const manager = new DatabaseManager(db);

// Apply schema
const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  );
`;
manager.applySchema(schema);

// Initialize migrations
const fs = createDenoFileSystem();
manager.initializeMigrations(fs, {
  migrationsPath: './migrations.yaml',
  yamlParser: parseYaml,
});

// Run migrations
await manager.migrateTo('latest');

// Close when done
manager.close();
```

## Schema Management

### Using applySchema

```typescript
import { applySchema } from 'numtwo';

const schema = `
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
`;

manager.applySchema(schema);
```

### Using SchemaBuilder

```typescript
import { createSchema } from 'numtwo';

const schema = createSchema()
  .table(`CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL
  )`)
  .index('CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)')
  .build();

manager.applySchema(schema);
```

## Migration System

### Creating Migrations

Create a `migrations.yaml` file:

```yaml
migrations:
  - version: 1
    name: "Create users table"
    description: "Initial users table with basic fields"
    reversible: true
    up: |
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL
      );
    down: |
      DROP TABLE users;

  - version: 2
    name: "Add user preferences"
    description: "Add preferences column to users table"
    reversible: true
    up: |
      ALTER TABLE users ADD COLUMN preferences TEXT;
    down: |
      ALTER TABLE users DROP COLUMN preferences;
```

### Running Migrations

**Programmatically:**

```typescript
// Migrate to latest
await manager.migrateTo('latest');

// Migrate to specific version
await manager.migrateTo(2);

// Check status
await manager.showMigrationStatus();

// Get current version
const version = manager.getCurrentVersion();
```

**Via CLI (Node.js):**

```bash
# Migrate to latest
npx numtwo-migrate

# Migrate to specific version
npx numtwo-migrate --to 2

# Show status
npx numtwo-migrate status
```

**Via CLI (Deno):**

```bash
# Migrate to latest
deno task migrate

# Migrate to specific version
deno run -A cli/migrate.deno.ts --to 2

# Show status
deno task migrate:status
```

### Environment Variables

- `DATABASE_PATH`: Path to database file (default: `./app.db`)
- `MIGRATIONS_PATH`: Path to migrations file (default: `./migrations.yaml`)
- `DATABASE_MIGRATION_TARGET`: Target version or `skip` (default: `latest`)

## Transaction Support

All database operations support transactions for atomic execution:

```typescript
// Simple transaction
manager.transaction(() => {
  manager.database.exec('INSERT INTO users (id, name) VALUES (?, ?)', '1', 'Alice');
  manager.database.exec('INSERT INTO users (id, name) VALUES (?, ?)', '2', 'Bob');
});

// Transaction with return value
const userId = manager.transaction(() => {
  const stmt = manager.database.prepare(
    'INSERT INTO users (id, name, email) VALUES (?, ?, ?) RETURNING id'
  );
  const result = stmt.get('3', 'Charlie', 'charlie@example.com');
  return result.id;
});

// Automatic rollback on error
try {
  manager.transaction(() => {
    manager.database.exec('INSERT INTO users (id, name) VALUES (?, ?)', '4', 'David');
    throw new Error('Something went wrong');
    // Transaction is automatically rolled back
  });
} catch (error) {
  console.log('Transaction failed:', error.message);
}
```

## Testing

Create in-memory databases for fast testing:

```typescript
import { createNodeTestDatabase } from 'numtwo';

// Node.js
const testDb = createNodeTestDatabase();
const manager = new DatabaseManager(testDb);

// Deno
import { createDenoTestDatabase } from 'numtwo';
const testDb = createDenoTestDatabase();
```

## Advanced Usage

### Direct Database Access

```typescript
// Access underlying database for advanced operations
const db = manager.database;

// Prepared statements
const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
const user = stmt.get('alice@example.com');

// Multiple results
const stmt2 = db.prepare('SELECT * FROM users WHERE created_at > ?');
const users = stmt2.all('2024-01-01');
```

### Custom Adapters

You can create custom adapters for other runtimes:

```typescript
import type { IDatabase, IFileSystem } from 'numtwo';

class MyCustomDatabase implements IDatabase {
  exec(sql: string, ...params: any[]): void { /* ... */ }
  prepare<T>(sql: string): IStatement<T> { /* ... */ }
  transaction<T>(fn: () => T): T { /* ... */ }
  close(): void { /* ... */ }
}

const customDb = new MyCustomDatabase();
const manager = new DatabaseManager(customDb);
```

## Architecture

The package is organized into layers:

```
numtwo/
├── core/               # Framework-agnostic core
│   ├── interfaces/     # IDatabase, IStatement, IFileSystem
│   ├── schema.ts       # Schema management utilities
│   └── migrations/     # Migration system
├── adapters/           # Runtime-specific adapters
│   ├── deno/          # Deno SQLite3 adapter
│   └── node/          # Node.js better-sqlite3 adapter
├── DatabaseManager.ts  # Main unified interface
└── cli/               # Migration CLI tools
```

## Best Practices

### Date Storage

Always store dates as TEXT strings to avoid overflow:

```typescript
// Good
const now = Date.now().toString();
db.exec('INSERT INTO users (id, created_at) VALUES (?, ?)', id, now);

// Bad - can overflow in SQLite
db.exec('INSERT INTO users (id, created_at) VALUES (?, ?)', id, Date.now());
```

### Migration Design

- Keep migrations small and focused
- Always provide rollback scripts (`down`) when possible
- Test migrations on a copy of your production data
- Never skip version numbers (1, 2, 3, ...)
- Use descriptive names and descriptions

### Transaction Guidelines

- Wrap multi-statement operations in transactions
- Keep transactions short and focused
- Don't perform I/O operations inside transactions
- Let transactions throw errors to trigger automatic rollback

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.

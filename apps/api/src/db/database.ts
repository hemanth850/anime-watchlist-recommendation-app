import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(currentDir, "migrations");
const defaultDbPath = join(currentDir, "..", "..", "data", "app.db");
const dbPath = process.env.DATABASE_PATH ?? defaultDbPath;

if (!existsSync(dirname(dbPath))) {
  mkdirSync(dirname(dbPath), { recursive: true });
}

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");

function ensureMigrationTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
}

function getAppliedMigrations(): Set<string> {
  const rows = db
    .prepare("SELECT id FROM schema_migrations")
    .all() as Array<{ id: string }>;
  return new Set(rows.map((row) => row.id));
}

function runMigrations(): void {
  ensureMigrationTable();
  const applied = getAppliedMigrations();
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), "utf8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db
        .prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)")
        .run(file, new Date().toISOString());
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

function getDatabase(): DatabaseSync {
  return db;
}

export { getDatabase, runMigrations };


import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getDatabase, runMigrations } from "./database.js";

function ensureDemoUser(): void {
  const db = getDatabase();
  const email = "demo@anime.app";
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email) as { id: string } | undefined;

  if (existing) {
    return;
  }

  db.prepare(`
    INSERT INTO users (id, email, username, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    email,
    "demo_user",
    bcrypt.hashSync("password123", 10),
    new Date().toISOString()
  );
}

function initializeDatabase(): void {
  runMigrations();
  ensureDemoUser();
}

export { initializeDatabase };


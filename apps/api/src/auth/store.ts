import { randomUUID } from "node:crypto";
import type { UserPublic } from "@anime-app/shared";
import { getDatabase } from "../db/database.js";

type StoredUser = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: string;
};

function mapUserRow(row: {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  created_at: string;
}): StoredUser {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at
  };
}

function toPublicUser(user: StoredUser): UserPublic {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    createdAt: user.createdAt
  };
}

function findUserByEmail(email: string): StoredUser | null {
  const db = getDatabase();
  const row = db
    .prepare(`
      SELECT id, email, username, password_hash, created_at
      FROM users
      WHERE email = ?
      LIMIT 1
    `)
    .get(email.toLowerCase()) as
    | {
        id: string;
        email: string;
        username: string;
        password_hash: string;
        created_at: string;
      }
    | undefined;

  return row ? mapUserRow(row) : null;
}

function findUserById(id: string): StoredUser | null {
  const db = getDatabase();
  const row = db
    .prepare(`
      SELECT id, email, username, password_hash, created_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `)
    .get(id) as
    | {
        id: string;
        email: string;
        username: string;
        password_hash: string;
        created_at: string;
      }
    | undefined;

  return row ? mapUserRow(row) : null;
}

function createUser(params: {
  email: string;
  username: string;
  passwordHash: string;
}): StoredUser {
  const db = getDatabase();
  const user: StoredUser = {
    id: randomUUID(),
    email: params.email.toLowerCase(),
    username: params.username,
    passwordHash: params.passwordHash,
    createdAt: new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO users (id, email, username, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(user.id, user.email, user.username, user.passwordHash, user.createdAt);

  return user;
}

export { type StoredUser, createUser, findUserByEmail, findUserById, toPublicUser };


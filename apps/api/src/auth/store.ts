import { randomUUID } from "node:crypto";
import type { UserPublic } from "@anime-app/shared";
import bcrypt from "bcryptjs";

type StoredUser = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: string;
};

const usersByEmail = new Map<string, StoredUser>();
const usersById = new Map<string, StoredUser>();

const seedUser: StoredUser = {
  id: randomUUID(),
  email: "demo@anime.app",
  username: "demo_user",
  passwordHash: bcrypt.hashSync("password123", 10),
  createdAt: new Date().toISOString()
};

usersByEmail.set(seedUser.email, seedUser);
usersById.set(seedUser.id, seedUser);

function toPublicUser(user: StoredUser): UserPublic {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    createdAt: user.createdAt
  };
}

function findUserByEmail(email: string): StoredUser | null {
  return usersByEmail.get(email.toLowerCase()) ?? null;
}

function findUserById(id: string): StoredUser | null {
  return usersById.get(id) ?? null;
}

function createUser(params: {
  email: string;
  username: string;
  passwordHash: string;
}): StoredUser {
  const normalizedEmail = params.email.toLowerCase();
  const user: StoredUser = {
    id: randomUUID(),
    email: normalizedEmail,
    username: params.username,
    passwordHash: params.passwordHash,
    createdAt: new Date().toISOString()
  };

  usersByEmail.set(normalizedEmail, user);
  usersById.set(user.id, user);
  return user;
}

export {
  type StoredUser,
  createUser,
  findUserByEmail,
  findUserById,
  toPublicUser
};

import cors from "cors";
import express from "express";
import {
  type AuthMeResponse,
  type AuthSuccessResponse,
  type LoginRequest,
  type SignupRequest,
  mockAnimeCatalog,
  type HealthResponse,
  type RecommendationResponse
} from "@anime-app/shared";
import bcrypt from "bcryptjs";
import { authRequired } from "./auth/middleware.js";
import {
  createUser,
  findUserByEmail,
  toPublicUser
} from "./auth/store.js";
import { signSessionToken } from "./auth/session.js";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/auth/signup", async (req, res) => {
  const body = req.body as Partial<SignupRequest>;
  const email = body.email?.trim().toLowerCase();
  const username = body.username?.trim();
  const password = body.password;

  if (!email || !username || !password) {
    res.status(400).json({ message: "email, username, and password are required" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ message: "password must be at least 8 characters" });
    return;
  }

  if (findUserByEmail(email)) {
    res.status(409).json({ message: "email is already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = createUser({ email, username, passwordHash });
  const token = signSessionToken(user.id, user.email);

  const payload: AuthSuccessResponse = {
    token,
    user: toPublicUser(user)
  };

  res.status(201).json(payload);
});

app.post("/auth/login", async (req, res) => {
  const body = req.body as Partial<LoginRequest>;
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    res.status(400).json({ message: "email and password are required" });
    return;
  }

  const user = findUserByEmail(email);
  if (!user) {
    res.status(401).json({ message: "invalid credentials" });
    return;
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    res.status(401).json({ message: "invalid credentials" });
    return;
  }

  const token = signSessionToken(user.id, user.email);
  const payload: AuthSuccessResponse = {
    token,
    user: toPublicUser(user)
  };

  res.status(200).json(payload);
});

app.get("/auth/me", authRequired, (req, res) => {
  const user = req.authUser;
  if (!user) {
    res.status(401).json({ message: "unauthorized" });
    return;
  }

  const payload: AuthMeResponse = {
    user: toPublicUser(user)
  };
  res.status(200).json(payload);
});

app.post("/auth/logout", (_req, res) => {
  res.status(200).json({ message: "logout successful" });
});

app.get("/health", (_req, res) => {
  const payload: HealthResponse = {
    status: "ok",
    service: "anime-api",
    timestamp: new Date().toISOString()
  };

  res.status(200).json(payload);
});

app.get("/recommendations/preview", (_req, res) => {
  const payload: RecommendationResponse = {
    items: mockAnimeCatalog.slice(0, 3).map((anime) => ({
      animeId: anime.id,
      score: anime.rating,
      reason: "Popular in the community and strong genre overlap"
    }))
  };

  res.status(200).json(payload);
});

export { app };

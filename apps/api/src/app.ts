import cors from "cors";
import express from "express";
import bcrypt from "bcryptjs";
import {
  type Anime,
  type AnimeStatus,
  type AuthMeResponse,
  type AuthSuccessResponse,
  type CatalogQuery,
  type CatalogResponse,
  type CreateWatchlistItemRequest,
  type HealthResponse,
  type LoginRequest,
  type RecommendationResponse,
  type SignupRequest,
  type UpdateWatchlistItemRequest,
  type WatchlistResponse,
  mockAnimeCatalog
} from "@anime-app/shared";
import { authRequired } from "./auth/middleware.js";
import { signSessionToken } from "./auth/session.js";
import { createUser, findUserByEmail, toPublicUser } from "./auth/store.js";
import { requestLogger } from "./middleware/logging.js";
import { getPersonalizedRecommendations } from "./recommendations/engine.js";
import {
  addWatchlistItem,
  getUserWatchlist,
  getWatchlistItem,
  removeWatchlistItem,
  updateWatchlistItem
} from "./watchlist/store.js";
import {
  isValidEmail,
  isValidRating,
  isValidStatus,
  parseCatalogSort,
  parseFloatOrNull,
  parsePositiveInt
} from "./utils/validation.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.post("/auth/signup", async (req, res) => {
  const body = req.body as Partial<SignupRequest>;
  const email = body.email?.trim().toLowerCase();
  const username = body.username?.trim();
  const password = body.password;

  if (!email || !username || !password) {
    res.status(400).json({ message: "email, username, and password are required" });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ message: "invalid email format" });
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

  if (!isValidEmail(email)) {
    res.status(400).json({ message: "invalid email format" });
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

app.get("/catalog", (req, res) => {
  const query = req.query as Partial<Record<keyof CatalogQuery, string>>;
  const q = query.q?.trim().toLowerCase() ?? "";
  const genre = query.genre?.trim().toLowerCase() ?? "";
  const minRatingRaw = query.minRating;
  const maxEpisodesRaw = query.maxEpisodes;
  const sort = parseCatalogSort(query.sort);

  let minRating = 0;
  if (minRatingRaw !== undefined) {
    const parsed = parseFloatOrNull(minRatingRaw);
    if (parsed === null || !isValidRating(parsed)) {
      res.status(400).json({ message: "minRating must be a number between 0 and 10" });
      return;
    }
    minRating = parsed;
  }

  let maxEpisodes = Number.MAX_SAFE_INTEGER;
  if (maxEpisodesRaw !== undefined) {
    const parsed = parsePositiveInt(maxEpisodesRaw);
    if (parsed === null || parsed === 0) {
      res.status(400).json({ message: "maxEpisodes must be a positive integer" });
      return;
    }
    maxEpisodes = parsed;
  }

  const filtered = mockAnimeCatalog
    .filter((anime) => {
      const matchesQuery = q === "" || anime.title.toLowerCase().includes(q);
      const matchesGenre =
        genre === "" || anime.genres.some((entry) => entry.toLowerCase() === genre);
      const matchesRating = anime.rating >= minRating;
      const matchesEpisodes = anime.episodes <= maxEpisodes;
      return matchesQuery && matchesGenre && matchesRating && matchesEpisodes;
    })
    .sort((a, b) => {
      if (sort === "rating_asc") {
        return a.rating - b.rating;
      }
      if (sort === "title_asc") {
        return a.title.localeCompare(b.title);
      }
      return b.rating - a.rating;
    });

  const payload: CatalogResponse = {
    items: filtered
  };
  res.status(200).json(payload);
});

app.get("/watchlist", authRequired, (req, res) => {
  const user = req.authUser;
  if (!user) {
    res.status(401).json({ message: "unauthorized" });
    return;
  }

  const payload: WatchlistResponse = {
    items: getUserWatchlist(user.id)
  };
  res.status(200).json(payload);
});

app.get("/recommendations/personalized", authRequired, (req, res) => {
  const user = req.authUser;
  if (!user) {
    res.status(401).json({ message: "unauthorized" });
    return;
  }

  const watchlist = getUserWatchlist(user.id);
  const payload = getPersonalizedRecommendations(watchlist);
  res.status(200).json(payload);
});

app.post("/watchlist", authRequired, (req, res) => {
  const user = req.authUser;
  if (!user) {
    res.status(401).json({ message: "unauthorized" });
    return;
  }

  const body = req.body as Partial<CreateWatchlistItemRequest>;
  const animeId = body.animeId?.trim();
  const status: AnimeStatus = body.status ?? "plan";
  if (!animeId) {
    res.status(400).json({ message: "animeId is required" });
    return;
  }

  if (!isValidStatus(status)) {
    res.status(400).json({ message: "invalid status value" });
    return;
  }

  const animeExists = mockAnimeCatalog.some((anime) => anime.id === animeId);
  if (!animeExists) {
    res.status(404).json({ message: "anime not found in catalog" });
    return;
  }

  if (getWatchlistItem(user.id, animeId)) {
    res.status(409).json({ message: "anime already in watchlist" });
    return;
  }

  const item = addWatchlistItem({
    userId: user.id,
    animeId,
    status
  });
  res.status(201).json(item);
});

app.patch("/watchlist/:animeId", authRequired, (req, res) => {
  const user = req.authUser;
  if (!user) {
    res.status(401).json({ message: "unauthorized" });
    return;
  }

  const animeId = String(req.params.animeId ?? "");
  if (!animeId) {
    res.status(400).json({ message: "animeId path parameter is required" });
    return;
  }
  const existing = getWatchlistItem(user.id, animeId);
  if (!existing) {
    res.status(404).json({ message: "watchlist item not found" });
    return;
  }

  const body = req.body as Partial<UpdateWatchlistItemRequest>;
  const updates: Partial<{
    status: AnimeStatus;
    rating: number | null;
    notes: string;
    progressEpisodes: number;
  }> = {};

  if (body.status !== undefined) {
    if (!isValidStatus(body.status)) {
      res.status(400).json({ message: "invalid status value" });
      return;
    }
    updates.status = body.status;
  }

  if (body.rating !== undefined) {
    if (body.rating !== null && !isValidRating(body.rating)) {
      res.status(400).json({ message: "rating must be between 0 and 10" });
      return;
    }
    updates.rating = body.rating;
  }

  if (body.notes !== undefined) {
    updates.notes = body.notes.trim().slice(0, 500);
  }

  if (body.progressEpisodes !== undefined) {
    if (!Number.isInteger(body.progressEpisodes) || body.progressEpisodes < 0) {
      res.status(400).json({ message: "progressEpisodes must be a non-negative integer" });
      return;
    }
    updates.progressEpisodes = body.progressEpisodes;
  }

  const updated = updateWatchlistItem(user.id, animeId, updates);
  if (!updated) {
    res.status(404).json({ message: "watchlist item not found" });
    return;
  }

  res.status(200).json(updated);
});

app.delete("/watchlist/:animeId", authRequired, (req, res) => {
  const user = req.authUser;
  if (!user) {
    res.status(401).json({ message: "unauthorized" });
    return;
  }

  const animeId = String(req.params.animeId ?? "");
  if (!animeId) {
    res.status(400).json({ message: "animeId path parameter is required" });
    return;
  }

  const deleted = removeWatchlistItem(user.id, animeId);
  if (!deleted) {
    res.status(404).json({ message: "watchlist item not found" });
    return;
  }

  res.status(204).send();
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

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use(
  (
    error: unknown,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(`[api] unhandled error on ${req.method} ${req.originalUrl}`, error);
    res.status(500).json({ message: "Internal server error" });
  }
);

export { app };


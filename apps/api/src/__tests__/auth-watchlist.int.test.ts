import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Express } from "express";

vi.mock("../catalog/jikan.js", () => {
  const catalog = [
    { id: "100", title: "Mock Titan", genres: ["Action", "Drama"], episodes: 25, rating: 9.1 },
    { id: "101", title: "Mock Frieren", genres: ["Adventure", "Fantasy"], episodes: 28, rating: 8.9 },
    { id: "102", title: "Mock Mob", genres: ["Action", "Comedy"], episodes: 37, rating: 8.6 }
  ];

  return {
    getAnimeById: async (animeId: string) => catalog.find((entry) => entry.id === animeId) ?? null,
    searchJikanCatalog: async () => catalog
  };
});

let app: Express;

beforeAll(async () => {
  const module = await import("../app.js");
  app = module.app;
});

describe("auth + watchlist integration", () => {
  it("allows signup, login, watchlist CRUD, and personalized recommendations", async () => {
    const email = `phase6_${Date.now()}@anime.app`;
    const password = "password123";

    const signupRes = await request(app).post("/auth/signup").send({
      email,
      username: "phase6_user",
      password
    });
    expect(signupRes.status).toBe(201);
    expect(signupRes.body.token).toBeTypeOf("string");

    const loginRes = await request(app).post("/auth/login").send({ email, password });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token as string;

    const addRes = await request(app)
      .post("/watchlist")
      .set("Authorization", `Bearer ${token}`)
      .send({ animeId: "100", status: "watching" });
    expect(addRes.status).toBe(201);

    const updateRes = await request(app)
      .patch("/watchlist/100")
      .set("Authorization", `Bearer ${token}`)
      .send({ rating: 9.1, progressEpisodes: 12, notes: "Great pacing" });
    expect(updateRes.status).toBe(200);

    const listRes = await request(app)
      .get("/watchlist")
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.items.length).toBeGreaterThan(0);
    expect(listRes.body.items[0]?.animeTitle).toBeTypeOf("string");

    const recRes = await request(app)
      .get("/recommendations/personalized")
      .set("Authorization", `Bearer ${token}`);
    expect(recRes.status).toBe(200);
    expect(Array.isArray(recRes.body.items)).toBe(true);
  });
});

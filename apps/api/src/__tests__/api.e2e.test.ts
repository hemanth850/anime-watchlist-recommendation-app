import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import type { Express } from "express";

vi.mock("../catalog/jikan.js", () => {
  const catalog = [
    { id: "100", title: "Mock Titan", genres: ["Action", "Drama"], episodes: 25, rating: 9.1 },
    { id: "101", title: "Mock Frieren", genres: ["Adventure", "Fantasy"], episodes: 28, rating: 8.9 }
  ];

  return {
    getAnimeById: async (animeId: string) => catalog.find((entry) => entry.id === animeId) ?? null,
    searchJikanCatalog: async () => catalog
  };
});

let app: Express;

describe("api e2e smoke", () => {
  let server: Server;
  let baseUrl = "";

  beforeAll(async () => {
    const module = await import("../app.js");
    app = module.app;
    server = app.listen(0);
    await new Promise<void>((resolve) => {
      server.once("listening", () => resolve());
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it("returns health and catalog endpoints", async () => {
    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);

    const catalog = await fetch(`${baseUrl}/catalog?genre=Adventure&sort=rating_desc`);
    expect(catalog.status).toBe(200);
    const payload = (await catalog.json()) as { items: Array<{ title: string }> };
    expect(payload.items.length).toBeGreaterThan(0);
  });
});

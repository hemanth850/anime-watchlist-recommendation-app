import { describe, expect, it } from "vitest";
import { getPersonalizedRecommendations } from "./engine.js";
import type { WatchlistEntry } from "@anime-app/shared";

describe("recommendation engine", () => {
  it("recommends unseen anime with explainable reasons", () => {
    const watchlist: WatchlistEntry[] = [
      {
        userId: "u1",
        animeId: "aot",
        status: "completed",
        rating: 9.4,
        notes: "great",
        progressEpisodes: 89,
        updatedAt: new Date().toISOString()
      },
      {
        userId: "u1",
        animeId: "fmab",
        status: "watching",
        rating: 8.9,
        notes: "solid",
        progressEpisodes: 20,
        updatedAt: new Date().toISOString()
      }
    ];

    const result = getPersonalizedRecommendations(watchlist);

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.some((item) => item.animeId === "aot")).toBe(false);
    expect(result.items[0]?.reason.length).toBeGreaterThan(0);
  });
});


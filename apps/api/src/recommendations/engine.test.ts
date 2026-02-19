import { describe, expect, it } from "vitest";
import { getPersonalizedRecommendations } from "./engine.js";
import type { Anime } from "@anime-app/shared";
import type { WatchlistEntry } from "@anime-app/shared";

describe("recommendation engine", () => {
  it("recommends unseen anime with explainable reasons", () => {
    const watchlist: WatchlistEntry[] = [
      {
        userId: "u1",
        animeId: "1",
        animeTitle: "Show One",
        animeGenres: ["Action", "Drama"],
        animeEpisodes: 12,
        status: "completed",
        rating: 9.4,
        notes: "great",
        progressEpisodes: 89,
        updatedAt: new Date().toISOString()
      },
      {
        userId: "u1",
        animeId: "2",
        animeTitle: "Show Two",
        animeGenres: ["Adventure", "Fantasy"],
        animeEpisodes: 24,
        status: "watching",
        rating: 8.9,
        notes: "solid",
        progressEpisodes: 20,
        updatedAt: new Date().toISOString()
      }
    ];

    const candidateCatalog: Anime[] = [
      { id: "1", title: "Show One", genres: ["Action"], episodes: 12, rating: 9.1 },
      { id: "2", title: "Show Two", genres: ["Adventure"], episodes: 24, rating: 8.8 },
      { id: "3", title: "Show Three", genres: ["Adventure", "Drama"], episodes: 13, rating: 8.9 }
    ];

    const result = getPersonalizedRecommendations(watchlist, candidateCatalog);

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.some((item) => item.animeId === "1")).toBe(false);
    expect(result.items[0]?.reason.length).toBeGreaterThan(0);
  });
});

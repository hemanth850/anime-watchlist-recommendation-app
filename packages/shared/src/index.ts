export type AnimeStatus = "plan" | "watching" | "completed" | "dropped";

export type Anime = {
  id: string;
  title: string;
  genres: string[];
  episodes: number;
  rating: number;
};

export type RecommendationItem = {
  animeId: string;
  score: number;
  reason: string;
};

export type RecommendationResponse = {
  items: RecommendationItem[];
};

export type HealthResponse = {
  status: "ok";
  service: string;
  timestamp: string;
};

export const mockAnimeCatalog: Anime[] = [
  {
    id: "aot",
    title: "Attack on Titan",
    genres: ["Action", "Drama", "Dark Fantasy"],
    episodes: 89,
    rating: 9.1
  },
  {
    id: "fmab",
    title: "Fullmetal Alchemist: Brotherhood",
    genres: ["Adventure", "Drama", "Fantasy"],
    episodes: 64,
    rating: 9.0
  },
  {
    id: "frieren",
    title: "Frieren: Beyond Journey's End",
    genres: ["Adventure", "Drama", "Fantasy"],
    episodes: 28,
    rating: 8.9
  },
  {
    id: "mob",
    title: "Mob Psycho 100",
    genres: ["Action", "Comedy", "Supernatural"],
    episodes: 37,
    rating: 8.7
  }
];


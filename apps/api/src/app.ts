import cors from "cors";
import express from "express";
import {
  mockAnimeCatalog,
  type HealthResponse,
  type RecommendationResponse
} from "@anime-app/shared";

const app = express();

app.use(cors());
app.use(express.json());

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


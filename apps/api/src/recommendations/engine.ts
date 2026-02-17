import {
  mockAnimeCatalog,
  type Anime,
  type AnimeStatus,
  type RecommendationItem,
  type RecommendationResponse,
  type WatchlistEntry
} from "@anime-app/shared";

const statusWeights: Record<AnimeStatus, number> = {
  completed: 1.3,
  watching: 0.9,
  plan: 0.3,
  dropped: -0.8
};

function buildGenrePreferenceScores(watchlist: WatchlistEntry[]): Map<string, number> {
  const genreScores = new Map<string, number>();

  for (const item of watchlist) {
    const anime = mockAnimeCatalog.find((entry) => entry.id === item.animeId);
    if (!anime) {
      continue;
    }

    const ratingAdjustment =
      item.rating === null ? 0 : (item.rating - 5) / 5;
    const entryWeight = statusWeights[item.status] + ratingAdjustment;

    for (const genre of anime.genres) {
      genreScores.set(genre, (genreScores.get(genre) ?? 0) + entryWeight);
    }
  }

  return genreScores;
}

function reasonForRecommendation(
  anime: Anime,
  genreScores: Map<string, number>,
  hasSignals: boolean
): string {
  if (!hasSignals) {
    return "Great community rating. Add more watchlist activity for personalized matches.";
  }

  const rankedGenres = anime.genres
    .map((genre) => ({ genre, score: genreScores.get(genre) ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .filter((entry) => entry.score > 0)
    .slice(0, 2)
    .map((entry) => entry.genre);

  if (rankedGenres.length > 0) {
    return `Recommended due to your interest in ${rankedGenres.join(" and ")}.`;
  }

  return "Recommended based on strong overall rating while we learn more from your list.";
}

function getPersonalizedRecommendations(watchlist: WatchlistEntry[]): RecommendationResponse {
  const watchedAnimeIds = new Set(watchlist.map((item) => item.animeId));
  const genreScores = buildGenrePreferenceScores(watchlist);
  const hasSignals = watchlist.length > 0;

  const candidateItems: RecommendationItem[] = mockAnimeCatalog
    .filter((anime) => !watchedAnimeIds.has(anime.id))
    .map((anime) => {
      const genreMatchScore = anime.genres.reduce(
        (sum, genre) => sum + (genreScores.get(genre) ?? 0),
        0
      );
      const catalogQualityScore = anime.rating / 10;
      const totalScore = Number((catalogQualityScore + genreMatchScore).toFixed(3));

      return {
        animeId: anime.id,
        score: totalScore,
        reason: reasonForRecommendation(anime, genreScores, hasSignals)
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return { items: candidateItems };
}

export { getPersonalizedRecommendations };


import type {
  Anime,
  AnimeStatus,
  RecommendationItem,
  RecommendationResponse,
  WatchlistEntry
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
    const ratingAdjustment = item.rating === null ? 0 : (item.rating - 5) / 5;
    const entryWeight = statusWeights[item.status] + ratingAdjustment;

    for (const genre of item.animeGenres) {
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
    return "Strong public rating. Add watchlist activity to improve personalization.";
  }

  const rankedGenres = anime.genres
    .map((genre) => ({ genre, score: genreScores.get(genre) ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .filter((entry) => entry.score > 0)
    .slice(0, 2)
    .map((entry) => entry.genre);

  if (rankedGenres.length > 0) {
    return `Matches your genre preferences: ${rankedGenres.join(" and ")}.`;
  }

  return "Good overall match from your recent watchlist behavior.";
}

function getPersonalizedRecommendations(
  watchlist: WatchlistEntry[],
  candidateCatalog: Anime[]
): RecommendationResponse {
  const watchedAnimeIds = new Set(watchlist.map((item) => item.animeId));
  const genreScores = buildGenrePreferenceScores(watchlist);
  const hasSignals = watchlist.length > 0;

  const candidateItems: RecommendationItem[] = candidateCatalog
    .filter((anime) => !watchedAnimeIds.has(anime.id))
    .map((anime) => {
      const genreMatchScore = anime.genres.reduce(
        (sum, genre) => sum + (genreScores.get(genre) ?? 0),
        0
      );
      const qualityScore = anime.rating / 10;
      const totalScore = Number((qualityScore + genreMatchScore).toFixed(3));

      return {
        animeId: anime.id,
        animeTitle: anime.title,
        score: totalScore,
        reason: reasonForRecommendation(anime, genreScores, hasSignals)
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return { items: candidateItems };
}

export { getPersonalizedRecommendations };


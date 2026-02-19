import type { Anime, CatalogQuery, CatalogSort } from "@anime-app/shared";

const JIKAN_BASE_URL = "https://api.jikan.moe/v4";
const SEARCH_TTL_MS = 60_000;
const ANIME_TTL_MS = 10 * 60_000;
const MAX_RETRIES = 3;

type JikanGenre = {
  name: string;
};

type JikanAnime = {
  mal_id: number;
  title: string;
  genres: JikanGenre[];
  episodes: number | null;
  score: number | null;
};

type JikanListResponse = {
  data: JikanAnime[];
};

type JikanItemResponse = {
  data: JikanAnime;
};

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const searchCache = new Map<string, CacheEntry<Anime[]>>();
const animeCache = new Map<string, CacheEntry<Anime>>();
const inFlightSearches = new Map<string, Promise<Anime[]>>();
const inFlightAnime = new Map<string, Promise<Anime | null>>();

function normalizeAnime(source: JikanAnime): Anime {
  return {
    id: String(source.mal_id),
    title: source.title,
    genres: source.genres.map((genre) => genre.name),
    episodes: source.episodes ?? 0,
    rating: source.score ?? 0
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value: string | null): number {
  if (!value) {
    return 1_000;
  }
  const numeric = Number.parseInt(value, 10);
  if (Number.isInteger(numeric) && numeric > 0) {
    return numeric * 1_000;
  }
  return 1_000;
}

async function fetchJson<T>(url: string): Promise<T> {
  let lastStatus = 500;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (response.ok) {
      return (await response.json()) as T;
    }

    lastStatus = response.status;
    const isRetriable = response.status === 429 || response.status >= 500;
    if (!isRetriable || attempt === MAX_RETRIES - 1) {
      throw new Error(`Jikan request failed: ${response.status}`);
    }

    const retryAfterMs =
      response.status === 429
        ? parseRetryAfterMs(response.headers.get("Retry-After"))
        : 500 * (attempt + 1);
    await sleep(retryAfterMs);
  }

  throw new Error(`Jikan request failed: ${lastStatus}`);
}

function sortAnime(items: Anime[], sort: CatalogSort): Anime[] {
  return [...items].sort((a, b) => {
    if (sort === "rating_asc") {
      return a.rating - b.rating;
    }
    if (sort === "title_asc") {
      return a.title.localeCompare(b.title);
    }
    return b.rating - a.rating;
  });
}

function now(): number {
  return Date.now();
}

function makeSearchCacheKey(query: CatalogQuery): string {
  return JSON.stringify({
    q: query.q ?? "",
    genre: query.genre ?? "",
    minRating: query.minRating ?? "",
    maxEpisodes: query.maxEpisodes ?? "",
    sort: query.sort ?? "rating_desc"
  });
}

function getCachedSearch(key: string): Anime[] | null {
  const entry = searchCache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= now()) {
    return null;
  }
  return entry.data;
}

function getStaleSearch(key: string): Anime[] | null {
  return searchCache.get(key)?.data ?? null;
}

async function doSearch(query: CatalogQuery): Promise<Anime[]> {
  const params = new URLSearchParams();
  params.set("limit", "25");
  params.set("page", "1");
  params.set("sfw", "true");

  if (query.q && query.q.trim() !== "") {
    params.set("q", query.q.trim());
  } else {
    params.set("order_by", "score");
    params.set("sort", "desc");
  }

  const endpoint =
    query.q && query.q.trim() !== ""
      ? `${JIKAN_BASE_URL}/anime?${params.toString()}`
      : `${JIKAN_BASE_URL}/top/anime?${params.toString()}`;

  const payload = await fetchJson<JikanListResponse>(endpoint);
  let items = payload.data.map(normalizeAnime);

  if (query.genre && query.genre.trim() !== "") {
    const targetGenre = query.genre.trim().toLowerCase();
    items = items.filter((anime) =>
      anime.genres.some((genre) => genre.toLowerCase() === targetGenre)
    );
  }

  if (query.minRating !== undefined) {
    const minRating = query.minRating;
    items = items.filter((anime) => anime.rating >= minRating);
  }

  if (query.maxEpisodes !== undefined) {
    const maxEpisodes = query.maxEpisodes;
    items = items.filter((anime) => anime.episodes <= maxEpisodes);
  }

  return sortAnime(items, query.sort ?? "rating_desc");
}

async function searchJikanCatalog(query: CatalogQuery): Promise<Anime[]> {
  const cacheKey = makeSearchCacheKey(query);
  const cached = getCachedSearch(cacheKey);
  if (cached) {
    return cached;
  }

  const running = inFlightSearches.get(cacheKey);
  if (running) {
    return running;
  }

  const requestPromise = (async () => {
    try {
      const result = await doSearch(query);
      searchCache.set(cacheKey, {
        data: result,
        expiresAt: now() + SEARCH_TTL_MS
      });
      return result;
    } catch (error) {
      const stale = getStaleSearch(cacheKey);
      if (stale) {
        console.warn("[jikan] using stale catalog cache after fetch failure");
        return stale;
      }
      throw error;
    } finally {
      inFlightSearches.delete(cacheKey);
    }
  })();

  inFlightSearches.set(cacheKey, requestPromise);
  return requestPromise;
}

async function getAnimeById(animeId: string): Promise<Anime | null> {
  if (!/^\d+$/.test(animeId)) {
    return null;
  }

  const cached = animeCache.get(animeId);
  if (cached && cached.expiresAt > now()) {
    return cached.data;
  }

  const running = inFlightAnime.get(animeId);
  if (running) {
    return running;
  }

  const requestPromise = (async () => {
    try {
      const payload = await fetchJson<JikanItemResponse>(
        `${JIKAN_BASE_URL}/anime/${animeId}`
      );
      const normalized = normalizeAnime(payload.data);
      animeCache.set(animeId, {
        data: normalized,
        expiresAt: now() + ANIME_TTL_MS
      });
      return normalized;
    } catch {
      const stale = animeCache.get(animeId)?.data ?? null;
      if (stale) {
        console.warn("[jikan] using stale anime cache after fetch failure");
        return stale;
      }
      return null;
    } finally {
      inFlightAnime.delete(animeId);
    }
  })();

  inFlightAnime.set(animeId, requestPromise);
  return requestPromise;
}

export { getAnimeById, searchJikanCatalog };

import type { AnimeStatus, WatchlistEntry } from "@anime-app/shared";

const watchlistsByUserId = new Map<string, Map<string, WatchlistEntry>>();

function getUserWatchlist(userId: string): WatchlistEntry[] {
  const watchlist = watchlistsByUserId.get(userId);
  if (!watchlist) {
    return [];
  }

  return Array.from(watchlist.values()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

function getWatchlistItem(userId: string, animeId: string): WatchlistEntry | null {
  return watchlistsByUserId.get(userId)?.get(animeId) ?? null;
}

function addWatchlistItem(params: {
  userId: string;
  animeId: string;
  status: AnimeStatus;
}): WatchlistEntry {
  const watchlist = watchlistsByUserId.get(params.userId) ?? new Map();
  const item: WatchlistEntry = {
    userId: params.userId,
    animeId: params.animeId,
    status: params.status,
    rating: null,
    notes: "",
    progressEpisodes: 0,
    updatedAt: new Date().toISOString()
  };

  watchlist.set(params.animeId, item);
  watchlistsByUserId.set(params.userId, watchlist);
  return item;
}

function updateWatchlistItem(
  userId: string,
  animeId: string,
  updates: Partial<Omit<WatchlistEntry, "userId" | "animeId" | "updatedAt">>
): WatchlistEntry | null {
  const watchlist = watchlistsByUserId.get(userId);
  const existingItem = watchlist?.get(animeId);
  if (!watchlist || !existingItem) {
    return null;
  }

  const updated: WatchlistEntry = {
    ...existingItem,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  watchlist.set(animeId, updated);
  return updated;
}

function removeWatchlistItem(userId: string, animeId: string): boolean {
  const watchlist = watchlistsByUserId.get(userId);
  if (!watchlist) {
    return false;
  }

  const deleted = watchlist.delete(animeId);
  if (watchlist.size === 0) {
    watchlistsByUserId.delete(userId);
  }
  return deleted;
}

export {
  addWatchlistItem,
  getUserWatchlist,
  getWatchlistItem,
  removeWatchlistItem,
  updateWatchlistItem
};


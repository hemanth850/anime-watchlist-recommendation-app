import { randomUUID } from "node:crypto";
import type { AnimeStatus, WatchlistEntry } from "@anime-app/shared";
import { getDatabase } from "../db/database.js";

type WatchlistRow = {
  user_id: string;
  anime_id: string;
  anime_title: string;
  anime_genres_json: string;
  anime_episodes: number;
  status: string;
  rating: number | null;
  notes: string;
  progress_episodes: number;
  updated_at: string;
};

function mapWatchlistRow(row: WatchlistRow): WatchlistEntry {
  return {
    userId: row.user_id,
    animeId: row.anime_id,
    animeTitle: row.anime_title,
    animeGenres: JSON.parse(row.anime_genres_json) as string[],
    animeEpisodes: row.anime_episodes,
    status: row.status as AnimeStatus,
    rating: row.rating,
    notes: row.notes,
    progressEpisodes: row.progress_episodes,
    updatedAt: row.updated_at
  };
}

function getUserWatchlist(userId: string): WatchlistEntry[] {
  const db = getDatabase();
  const rows = db
    .prepare(`
      SELECT
        user_id, anime_id, anime_title, anime_genres_json, anime_episodes,
        status, rating, notes, progress_episodes, updated_at
      FROM watchlist_items
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `)
    .all(userId) as WatchlistRow[];

  return rows.map(mapWatchlistRow);
}

function getWatchlistItem(userId: string, animeId: string): WatchlistEntry | null {
  const db = getDatabase();
  const row = db
    .prepare(`
      SELECT
        user_id, anime_id, anime_title, anime_genres_json, anime_episodes,
        status, rating, notes, progress_episodes, updated_at
      FROM watchlist_items
      WHERE user_id = ? AND anime_id = ?
      LIMIT 1
    `)
    .get(userId, animeId) as WatchlistRow | undefined;

  return row ? mapWatchlistRow(row) : null;
}

function addWatchlistItem(params: {
  userId: string;
  animeId: string;
  animeTitle: string;
  animeGenres: string[];
  animeEpisodes: number;
  status: AnimeStatus;
}): WatchlistEntry {
  const db = getDatabase();
  const timestamp = new Date().toISOString();

  db.prepare(`
    INSERT INTO watchlist_items (
      id, user_id, anime_id, anime_title, anime_genres_json, anime_episodes,
      status, rating, notes, progress_episodes, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    params.userId,
    params.animeId,
    params.animeTitle,
    JSON.stringify(params.animeGenres),
    params.animeEpisodes,
    params.status,
    null,
    "",
    0,
    timestamp,
    timestamp
  );

  return {
    userId: params.userId,
    animeId: params.animeId,
    animeTitle: params.animeTitle,
    animeGenres: params.animeGenres,
    animeEpisodes: params.animeEpisodes,
    status: params.status,
    rating: null,
    notes: "",
    progressEpisodes: 0,
    updatedAt: timestamp
  };
}

function updateWatchlistItem(
  userId: string,
  animeId: string,
  updates: Partial<Omit<WatchlistEntry, "userId" | "animeId" | "updatedAt">>
): WatchlistEntry | null {
  const existing = getWatchlistItem(userId, animeId);
  if (!existing) {
    return null;
  }

  const merged: WatchlistEntry = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  const db = getDatabase();
  db.prepare(`
    UPDATE watchlist_items
    SET
      anime_title = ?,
      anime_genres_json = ?,
      anime_episodes = ?,
      status = ?,
      rating = ?,
      notes = ?,
      progress_episodes = ?,
      updated_at = ?
    WHERE user_id = ? AND anime_id = ?
  `).run(
    merged.animeTitle,
    JSON.stringify(merged.animeGenres),
    merged.animeEpisodes,
    merged.status,
    merged.rating,
    merged.notes,
    merged.progressEpisodes,
    merged.updatedAt,
    userId,
    animeId
  );

  return merged;
}

function removeWatchlistItem(userId: string, animeId: string): boolean {
  const db = getDatabase();
  const result = db
    .prepare("DELETE FROM watchlist_items WHERE user_id = ? AND anime_id = ?")
    .run(userId, animeId);
  return result.changes > 0;
}

export {
  addWatchlistItem,
  getUserWatchlist,
  getWatchlistItem,
  removeWatchlistItem,
  updateWatchlistItem
};


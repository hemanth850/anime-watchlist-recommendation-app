CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  anime_id TEXT NOT NULL,
  anime_title TEXT NOT NULL,
  anime_genres_json TEXT NOT NULL,
  anime_episodes INTEGER NOT NULL,
  status TEXT NOT NULL,
  rating REAL NULL,
  notes TEXT NOT NULL DEFAULT '',
  progress_episodes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, anime_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);


import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  AnimeStatus,
  AuthMeResponse,
  AuthSuccessResponse,
  CreateWatchlistItemRequest,
  HealthResponse,
  LoginRequest,
  RecommendationResponse,
  SignupRequest,
  UpdateWatchlistItemRequest,
  UserPublic,
  WatchlistEntry,
  WatchlistResponse
} from "@anime-app/shared";
import { mockAnimeCatalog } from "@anime-app/shared";

const apiBaseUrl = "http://localhost:4000";
const tokenStorageKey = "anime_app_token";
const statusOptions: AnimeStatus[] = ["plan", "watching", "completed", "dropped"];

type AuthMode = "login" | "signup";
type WatchlistDraft = Record<
  string,
  {
    status: AnimeStatus;
    rating: string;
    notes: string;
    progressEpisodes: number;
  }
>;

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(errorBody?.message ?? `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [recommendations, setRecommendations] =
    useState<RecommendationResponse | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authUser, setAuthUser] = useState<UserPublic | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [baseError, setBaseError] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [watchlistDrafts, setWatchlistDrafts] = useState<WatchlistDraft>({});
  const [watchlistError, setWatchlistError] = useState<string | null>(null);
  const [selectedAnimeId, setSelectedAnimeId] = useState<string>(
    mockAnimeCatalog[0]?.id ?? ""
  );
  const [selectedAnimeStatus, setSelectedAnimeStatus] = useState<AnimeStatus>("plan");

  useEffect(() => {
    const load = async () => {
      try {
        const [healthRes, recRes] = await Promise.all([
          fetchJson<HealthResponse>("/health"),
          fetchJson<RecommendationResponse>("/recommendations/preview")
        ]);
        setHealth(healthRes);
        setRecommendations(recRes);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Unknown error";
        setBaseError(message);
      }
    };

    void load();
  }, []);

  const authHeaders = useMemo(() => {
    if (!authToken) {
      return undefined;
    }

    return {
      Authorization: `Bearer ${authToken}`
    };
  }, [authToken]);

  const loadWatchlist = async (token: string) => {
    const data = await fetchJson<WatchlistResponse>("/watchlist", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    setWatchlist(data.items);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem(tokenStorageKey);
    if (!storedToken) {
      return;
    }

    const bootstrapSession = async () => {
      try {
        const me = await fetchJson<AuthMeResponse>("/auth/me", {
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        });
        setAuthToken(storedToken);
        setAuthUser(me.user);
        await loadWatchlist(storedToken);
      } catch {
        localStorage.removeItem(tokenStorageKey);
      }
    };

    void bootstrapSession();
  }, []);

  useEffect(() => {
    const drafts: WatchlistDraft = {};
    for (const item of watchlist) {
      drafts[item.animeId] = {
        status: item.status,
        rating: item.rating?.toString() ?? "",
        notes: item.notes,
        progressEpisodes: item.progressEpisodes
      };
    }
    setWatchlistDrafts(drafts);
  }, [watchlist]);

  const recommendationView = useMemo(() => {
    if (!recommendations) {
      return [];
    }

    return recommendations.items.map((item) => {
      const anime = mockAnimeCatalog.find((entry) => entry.id === item.animeId);
      return {
        id: item.animeId,
        title: anime?.title ?? item.animeId,
        score: item.score,
        reason: item.reason
      };
    });
  }, [recommendations]);

  const animeById = useMemo(
    () =>
      Object.fromEntries(
        mockAnimeCatalog.map((anime) => [anime.id, anime] as const)
      ),
    []
  );

  const updateDraft = (
    animeId: string,
    updater: (
      current: WatchlistDraft[string]
    ) => WatchlistDraft[string]
  ) => {
    setWatchlistDrafts((prev) => {
      const current = prev[animeId];
      if (!current) {
        return prev;
      }

      return {
        ...prev,
        [animeId]: updater(current)
      };
    });
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoadingAuth(true);
    setAuthError(null);

    try {
      const endpoint = authMode === "signup" ? "/auth/signup" : "/auth/login";
      const payload: SignupRequest | LoginRequest =
        authMode === "signup"
          ? { email, username, password }
          : { email, password };

      const result = await fetchJson<AuthSuccessResponse>(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      localStorage.setItem(tokenStorageKey, result.token);
      setAuthToken(result.token);
      setAuthUser(result.user);
      setPassword("");
      await loadWatchlist(result.token);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Authentication failed";
      setAuthError(message);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (authToken) {
        await fetchJson<{ message: string }>("/auth/logout", {
          method: "POST",
          headers: authHeaders
        });
      }
    } finally {
      localStorage.removeItem(tokenStorageKey);
      setAuthToken(null);
      setAuthUser(null);
      setWatchlist([]);
      setWatchlistDrafts({});
      setPassword("");
      setWatchlistError(null);
    }
  };

  const handleAddToWatchlist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authHeaders) {
      return;
    }
    if (!selectedAnimeId) {
      setWatchlistError("Select an anime before adding to watchlist");
      return;
    }

    setWatchlistError(null);
    try {
      const payload: CreateWatchlistItemRequest = {
        animeId: selectedAnimeId,
        status: selectedAnimeStatus
      };
      await fetchJson<WatchlistEntry>("/watchlist", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      await loadWatchlist(authToken!);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to add watchlist item";
      setWatchlistError(message);
    }
  };

  const handleUpdateWatchlistItem = async (animeId: string) => {
    if (!authHeaders) {
      return;
    }

    const draft = watchlistDrafts[animeId];
    if (!draft) {
      return;
    }

    const ratingValue =
      draft.rating.trim() === "" ? null : Number.parseFloat(draft.rating.trim());
    if (ratingValue !== null && Number.isNaN(ratingValue)) {
      setWatchlistError("Rating must be a valid number between 0 and 10");
      return;
    }

    setWatchlistError(null);
    try {
      const payload: UpdateWatchlistItemRequest = {
        status: draft.status,
        rating: ratingValue,
        notes: draft.notes,
        progressEpisodes: draft.progressEpisodes
      };
      await fetchJson<WatchlistEntry>(`/watchlist/${animeId}`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      await loadWatchlist(authToken!);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update watchlist item";
      setWatchlistError(message);
    }
  };

  const handleDeleteWatchlistItem = async (animeId: string) => {
    if (!authHeaders) {
      return;
    }

    setWatchlistError(null);
    try {
      await fetchJson<void>(`/watchlist/${animeId}`, {
        method: "DELETE",
        headers: authHeaders
      });
      await loadWatchlist(authToken!);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete watchlist item";
      setWatchlistError(message);
    }
  };

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Anime Watchlist Platform</p>
        <h1>Track what you watch and discover what to watch next.</h1>
        <p className="subtitle">
          Phase 3 adds watchlist CRUD with status transitions, ratings, and notes.
        </p>
      </section>

      <section className="panel">
        <h2>API Status</h2>
        {baseError && <p className="error">Connection issue: {baseError}</p>}
        {!baseError && !health && <p>Loading API health...</p>}
        {health && (
          <p>
            <strong>{health.service}</strong> is <strong>{health.status}</strong>
            {" "}at {new Date(health.timestamp).toLocaleTimeString()}.
          </p>
        )}
      </section>

      {!authUser ? (
        <section className="panel">
          <h2>{authMode === "signup" ? "Create Account" : "Login"}</h2>
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            {authMode === "signup" && (
              <label>
                Username
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </label>
            )}

            <label>
              Password
              <input
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {authError && <p className="error">{authError}</p>}

            <button type="submit" disabled={loadingAuth}>
              {loadingAuth
                ? "Submitting..."
                : authMode === "signup"
                  ? "Sign up"
                  : "Log in"}
            </button>
          </form>

          <button
            className="secondary-btn"
            type="button"
            onClick={() => {
              setAuthError(null);
              setAuthMode((prev) => (prev === "signup" ? "login" : "signup"));
            }}
          >
            {authMode === "signup"
              ? "Have an account? Switch to login"
              : "Need an account? Switch to signup"}
          </button>
          <p className="hint">
            Demo account: <code>demo@anime.app</code> / <code>password123</code>
          </p>
        </section>
      ) : (
        <section className="panel">
          <h2>Account</h2>
          <p>
            Logged in as <strong>{authUser.username}</strong> ({authUser.email})
          </p>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </section>
      )}

      {authUser && (
        <section className="panel">
          <h2>Your Watchlist</h2>
          {watchlistError && <p className="error">{watchlistError}</p>}

          <form className="watchlist-add-form" onSubmit={handleAddToWatchlist}>
            <label>
              Anime
              <select
                value={selectedAnimeId}
                onChange={(event) => setSelectedAnimeId(event.target.value)}
              >
                {mockAnimeCatalog.map((anime) => (
                  <option key={anime.id} value={anime.id}>
                    {anime.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Initial Status
              <select
                value={selectedAnimeStatus}
                onChange={(event) =>
                  setSelectedAnimeStatus(event.target.value as AnimeStatus)
                }
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">Add to Watchlist</button>
          </form>

          {watchlist.length === 0 && (
            <p>Your watchlist is empty. Add an anime to get started.</p>
          )}

          <ul className="watchlist-grid">
            {watchlist.map((item) => {
              const anime = animeById[item.animeId];
              const draft = watchlistDrafts[item.animeId];
              if (!draft) {
                return null;
              }

              return (
                <li key={item.animeId} className="watchlist-card">
                  <h3>{anime?.title ?? item.animeId}</h3>
                  <p className="watchlist-meta">
                    Episodes: {anime?.episodes ?? "-"} | Genres:{" "}
                    {anime?.genres.join(", ") ?? "-"}
                  </p>

                  <label>
                    Status
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        updateDraft(item.animeId, (current) => ({
                          ...current,
                          status: event.target.value as AnimeStatus
                        }))
                      }
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Rating (0-10)
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={draft.rating}
                      onChange={(event) =>
                        updateDraft(item.animeId, (current) => ({
                          ...current,
                          rating: event.target.value
                        }))
                      }
                    />
                  </label>

                  <label>
                    Progress Episodes
                    <input
                      type="number"
                      min={0}
                      value={draft.progressEpisodes}
                      onChange={(event) =>
                        updateDraft(item.animeId, (current) => ({
                          ...current,
                          progressEpisodes:
                            Number.parseInt(event.target.value, 10) || 0
                        }))
                      }
                    />
                  </label>

                  <label>
                    Notes
                    <textarea
                      rows={3}
                      value={draft.notes}
                      onChange={(event) =>
                        updateDraft(item.animeId, (current) => ({
                          ...current,
                          notes: event.target.value
                        }))
                      }
                    />
                  </label>

                  <div className="watchlist-actions">
                    <button type="button" onClick={() => handleUpdateWatchlistItem(item.animeId)}>
                      Save Changes
                    </button>
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={() => handleDeleteWatchlistItem(item.animeId)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="panel">
        <h2>Recommendation Preview</h2>
        {!recommendations && !baseError && <p>Loading recommendations...</p>}
        <ul className="recommendation-list">
          {recommendationView.map((item) => (
            <li key={item.id}>
              <h3>{item.title}</h3>
              <p>Score: {item.score.toFixed(1)}</p>
              <p>{item.reason}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;

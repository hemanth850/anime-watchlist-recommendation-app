import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  Anime,
  AnimeStatus,
  AuthMeResponse,
  AuthSuccessResponse,
  CatalogQuery,
  CatalogResponse,
  CatalogSort,
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

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const tokenStorageKey = "anime_app_token";
const statusOptions: AnimeStatus[] = ["plan", "watching", "completed", "dropped"];
const catalogSortOptions: CatalogSort[] = ["rating_desc", "rating_asc", "title_asc"];

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

function toCatalogQueryString(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.q && query.q.trim() !== "") {
    params.set("q", query.q.trim());
  }
  if (query.genre && query.genre.trim() !== "") {
    params.set("genre", query.genre.trim());
  }
  if (query.minRating !== undefined) {
    params.set("minRating", String(query.minRating));
  }
  if (query.maxEpisodes !== undefined) {
    params.set("maxEpisodes", String(query.maxEpisodes));
  }
  if (query.sort) {
    params.set("sort", query.sort);
  }
  const asString = params.toString();
  return asString ? `?${asString}` : "";
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [recommendations, setRecommendations] =
    useState<RecommendationResponse | null>(null);
  const [personalizedRecommendations, setPersonalizedRecommendations] =
    useState<RecommendationResponse | null>(null);
  const [catalogItems, setCatalogItems] = useState<Anime[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authUser, setAuthUser] = useState<UserPublic | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [baseError, setBaseError] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [loadingProtected, setLoadingProtected] = useState(false);
  const [watchlistMutationLoading, setWatchlistMutationLoading] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [watchlistDrafts, setWatchlistDrafts] = useState<WatchlistDraft>({});
  const [watchlistError, setWatchlistError] = useState<string | null>(null);
  const [personalizedError, setPersonalizedError] = useState<string | null>(null);
  const [selectedAnimeId, setSelectedAnimeId] = useState<string>("");
  const [selectedAnimeStatus, setSelectedAnimeStatus] = useState<AnimeStatus>("plan");
  const [searchText, setSearchText] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [minRatingFilter, setMinRatingFilter] = useState("");
  const [maxEpisodesFilter, setMaxEpisodesFilter] = useState("");
  const [catalogSort, setCatalogSort] = useState<CatalogSort>("rating_desc");

  const genreOptions = useMemo(
    () =>
      Array.from(new Set(catalogItems.flatMap((anime) => anime.genres))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [catalogItems]
  );

  const authHeaders = useMemo(() => {
    if (!authToken) {
      return undefined;
    }
    return {
      Authorization: `Bearer ${authToken}`
    };
  }, [authToken]);

  const loadCatalog = async (query: CatalogQuery) => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const path = `/catalog${toCatalogQueryString(query)}`;
      const data = await fetchJson<CatalogResponse>(path);
      setCatalogItems(data.items);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load catalog";
      setCatalogError(message);
      setCatalogItems([]);
    } finally {
      setCatalogLoading(false);
    }
  };

  const loadWatchlist = async (token: string) => {
    const data = await fetchJson<WatchlistResponse>("/watchlist", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    setWatchlist(data.items);
  };

  const loadPersonalizedRecommendations = async (token: string) => {
    const data = await fetchJson<RecommendationResponse>(
      "/recommendations/personalized",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    setPersonalizedRecommendations(data);
  };

  const loadProtectedData = async (token: string) => {
    setLoadingProtected(true);
    try {
      await loadWatchlist(token);
      try {
        await loadPersonalizedRecommendations(token);
        setPersonalizedError(null);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load personalized recommendations";
        setPersonalizedError(message);
        setPersonalizedRecommendations(null);
      }
    } finally {
      setLoadingProtected(false);
    }
  };

  useEffect(() => {
    const loadPublicData = async () => {
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

    void loadPublicData();
    void loadCatalog({ sort: "rating_desc" });
  }, []);

  useEffect(() => {
    if (catalogItems.length === 0) {
      setSelectedAnimeId("");
      return;
    }

    setSelectedAnimeId((prev) => {
      if (prev !== "" && catalogItems.some((anime) => anime.id === prev)) {
        return prev;
      }
      return catalogItems[0]?.id ?? "";
    });
  }, [catalogItems]);

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
        await loadProtectedData(storedToken);
      } catch {
        localStorage.removeItem(tokenStorageKey);
      }
    };

    void bootstrapSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      return {
        id: item.animeId,
        title: item.animeTitle,
        score: item.score,
        reason: item.reason
      };
    });
  }, [recommendations]);

  const updateDraft = (
    animeId: string,
    updater: (current: WatchlistDraft[string]) => WatchlistDraft[string]
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

  const handleCatalogFilterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const minRating =
      minRatingFilter.trim() === ""
        ? undefined
        : Number.parseFloat(minRatingFilter.trim());
    if (minRating !== undefined && Number.isNaN(minRating)) {
      setCatalogError("Min rating must be a number between 0 and 10");
      return;
    }

    const maxEpisodes =
      maxEpisodesFilter.trim() === ""
        ? undefined
        : Number.parseInt(maxEpisodesFilter.trim(), 10);
    if (maxEpisodes !== undefined && (!Number.isInteger(maxEpisodes) || maxEpisodes <= 0)) {
      setCatalogError("Max episodes must be a positive integer");
      return;
    }

    await loadCatalog({
      q: searchText,
      genre: genreFilter || undefined,
      minRating,
      maxEpisodes,
      sort: catalogSort
    });
  };

  const handleResetCatalogFilters = async () => {
    setSearchText("");
    setGenreFilter("");
    setMinRatingFilter("");
    setMaxEpisodesFilter("");
    setCatalogSort("rating_desc");
    await loadCatalog({ sort: "rating_desc" });
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
      await loadProtectedData(result.token);
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
      if (authToken && authHeaders) {
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
      setPersonalizedRecommendations(null);
      setPassword("");
      setWatchlistError(null);
      setPersonalizedError(null);
    }
  };

  const handleAddToWatchlist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authHeaders || !authToken) {
      return;
    }
    if (!selectedAnimeId) {
      setWatchlistError("Select an anime before adding to watchlist");
      return;
    }

    setWatchlistMutationLoading(true);
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
      await loadProtectedData(authToken);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to add watchlist item";
      setWatchlistError(message);
    } finally {
      setWatchlistMutationLoading(false);
    }
  };

  const handleUpdateWatchlistItem = async (animeId: string) => {
    if (!authHeaders || !authToken) {
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

    setWatchlistMutationLoading(true);
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
      await loadProtectedData(authToken);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update watchlist item";
      setWatchlistError(message);
    } finally {
      setWatchlistMutationLoading(false);
    }
  };

  const handleDeleteWatchlistItem = async (animeId: string) => {
    if (!authHeaders || !authToken) {
      return;
    }

    setWatchlistMutationLoading(true);
    setWatchlistError(null);
    try {
      await fetchJson<void>(`/watchlist/${animeId}`, {
        method: "DELETE",
        headers: authHeaders
      });
      await loadProtectedData(authToken);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete watchlist item";
      setWatchlistError(message);
    } finally {
      setWatchlistMutationLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="ambient ambient-a" aria-hidden="true" />
      <div className="ambient ambient-b" aria-hidden="true" />
      <div className="ambient ambient-c" aria-hidden="true" />

      <section className="hero glass">
        <p className="eyebrow">Anime Watchlist Platform</p>
        <h1>Track what you watch and discover what to watch next.</h1>
        <p className="subtitle">
          Phase 6 focuses on release readiness with CI, tests, and deployment support
          on top of discovery and recommendation features.
        </p>
      </section>

      <section className="panel glass">
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
        <section className="panel glass">
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
        <section className="panel glass">
          <h2>Account</h2>
          <p>
            Logged in as <strong>{authUser.username}</strong> ({authUser.email})
          </p>
          {loadingProtected && <p>Refreshing private data...</p>}
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </section>
      )}

      <section className="panel glass">
        <h2>Discover Anime</h2>
        <form className="catalog-filter-form" onSubmit={handleCatalogFilterSubmit}>
          <label>
            Search Title
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="e.g. Titan"
            />
          </label>
          <label>
            Genre
            <select
              value={genreFilter}
              onChange={(event) => setGenreFilter(event.target.value)}
            >
              <option value="">All genres</option>
              {genreOptions.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Min Rating
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={minRatingFilter}
              onChange={(event) => setMinRatingFilter(event.target.value)}
            />
          </label>
          <label>
            Max Episodes
            <input
              type="number"
              min={1}
              value={maxEpisodesFilter}
              onChange={(event) => setMaxEpisodesFilter(event.target.value)}
            />
          </label>
          <label>
            Sort
            <select
              value={catalogSort}
              onChange={(event) => setCatalogSort(event.target.value as CatalogSort)}
            >
              {catalogSortOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="catalog-filter-actions">
            <button type="submit" disabled={catalogLoading}>
              {catalogLoading ? "Searching..." : "Apply Filters"}
            </button>
            <button
              className="secondary-btn"
              type="button"
              onClick={() => {
                void handleResetCatalogFilters();
              }}
              disabled={catalogLoading}
            >
              Reset
            </button>
          </div>
        </form>

        {catalogError && <p className="error">{catalogError}</p>}
        {!catalogError && catalogLoading && <p>Loading catalog...</p>}
        {!catalogLoading && <p>{catalogItems.length} result(s) in catalog.</p>}
      </section>

      {authUser && (
        <section className="panel glass">
          <h2>Your Watchlist</h2>
          {watchlistError && <p className="error">{watchlistError}</p>}

          <form className="watchlist-add-form" onSubmit={handleAddToWatchlist}>
            <label>
              Anime
              <select
                value={selectedAnimeId}
                onChange={(event) => setSelectedAnimeId(event.target.value)}
              >
                {catalogItems.map((anime) => (
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
            <button type="submit" disabled={watchlistMutationLoading || selectedAnimeId === ""}>
              {watchlistMutationLoading ? "Saving..." : "Add to Watchlist"}
            </button>
          </form>

          {watchlist.length === 0 && (
            <p>Your watchlist is empty. Add an anime to get started.</p>
          )}

          <ul className="watchlist-grid">
            {watchlist.map((item) => {
              const draft = watchlistDrafts[item.animeId];
              if (!draft) {
                return null;
              }

              return (
                <li key={item.animeId} className="watchlist-card">
                  <h3>{item.animeTitle}</h3>
                  <p className="watchlist-meta">
                    Episodes: {item.animeEpisodes || "-"} | Genres:{" "}
                    {item.animeGenres.join(", ") || "-"}
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
                    <button
                      type="button"
                      onClick={() => {
                        void handleUpdateWatchlistItem(item.animeId);
                      }}
                      disabled={watchlistMutationLoading}
                    >
                      {watchlistMutationLoading ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={() => {
                        void handleDeleteWatchlistItem(item.animeId);
                      }}
                      disabled={watchlistMutationLoading}
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

      <section className="panel glass">
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

      <section className="panel glass">
        <h2>Personalized Recommendations</h2>
        {!authUser && <p>Login to see recommendations based on your watchlist activity.</p>}
        {authUser && personalizedError && <p className="error">{personalizedError}</p>}
        {authUser && !personalizedRecommendations && !personalizedError && (
          <p>Loading personalized recommendations...</p>
        )}
        {authUser && personalizedRecommendations && personalizedRecommendations.items.length === 0 && (
          <p>No unseen titles available yet. Expand the anime catalog in a later phase.</p>
        )}
        {authUser && personalizedRecommendations && personalizedRecommendations.items.length > 0 && (
          <ul className="recommendation-list">
            {personalizedRecommendations.items.map((item) => {
              return (
                <li key={`personalized-${item.animeId}`}>
                  <h3>{item.animeTitle}</h3>
                  <p>Score: {item.score.toFixed(2)}</p>
                  <p>{item.reason}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;

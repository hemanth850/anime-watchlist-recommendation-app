import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  AuthMeResponse,
  AuthSuccessResponse,
  HealthResponse,
  LoginRequest,
  RecommendationResponse,
  SignupRequest,
  UserPublic
} from "@anime-app/shared";
import { mockAnimeCatalog } from "@anime-app/shared";

const apiBaseUrl = "http://localhost:4000";
const tokenStorageKey = "anime_app_token";

type AuthMode = "login" | "signup";

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(errorBody?.message ?? `Request failed: ${response.status}`);
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
      } catch {
        localStorage.removeItem(tokenStorageKey);
      }
    };

    void bootstrapSession();
  }, []);

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
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        });
      }
    } finally {
      localStorage.removeItem(tokenStorageKey);
      setAuthToken(null);
      setAuthUser(null);
      setPassword("");
    }
  };

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Anime Watchlist Platform</p>
        <h1>Track what you watch and discover what to watch next.</h1>
        <p className="subtitle">
          Phase 2 adds account signup/login plus protected session state.
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

      <section className="panel">
        <h2>Protected Route Preview</h2>
        {!authUser && <p>Login required to access your personalized dashboard.</p>}
        {authUser && (
          <p>
            Access granted. Next phase will show your private watchlist and ratings
            here.
          </p>
        )}
      </section>
    </main>
  );
}

export default App;

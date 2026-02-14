import { useEffect, useMemo, useState } from "react";
import type { HealthResponse, RecommendationResponse } from "@anime-app/shared";
import { mockAnimeCatalog } from "@anime-app/shared";

const apiBaseUrl = "http://localhost:4000";

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [recommendations, setRecommendations] =
    useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [healthRes, recRes] = await Promise.all([
          fetch(`${apiBaseUrl}/health`),
          fetch(`${apiBaseUrl}/recommendations/preview`)
        ]);

        if (!healthRes.ok || !recRes.ok) {
          throw new Error("Failed to load initial API data");
        }

        setHealth((await healthRes.json()) as HealthResponse);
        setRecommendations((await recRes.json()) as RecommendationResponse);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Unknown error";
        setError(message);
      }
    };

    void load();
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

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Anime Watchlist Platform</p>
        <h1>Track what you watch and discover what to watch next.</h1>
        <p className="subtitle">
          This is the project foundation. Next phases add auth, watchlist CRUD,
          and personalized recommendations.
        </p>
      </section>

      <section className="panel">
        <h2>API Status</h2>
        {error && <p className="error">Connection issue: {error}</p>}
        {!error && !health && <p>Loading API health...</p>}
        {health && (
          <p>
            <strong>{health.service}</strong> is <strong>{health.status}</strong>
            {" "}at {new Date(health.timestamp).toLocaleTimeString()}.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Recommendation Preview</h2>
        {!recommendations && !error && <p>Loading recommendations...</p>}
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
        <h2>Phase Checklist</h2>
        <ul className="checklist">
          <li>Phase 1: Workspace + API + Web foundation</li>
          <li>Phase 2: User authentication</li>
          <li>Phase 3: Watchlist and ratings</li>
          <li>Phase 4: Personalized recommendation engine</li>
          <li>Phase 5: Tests, CI/CD, and production release</li>
        </ul>
      </section>
    </main>
  );
}

export default App;


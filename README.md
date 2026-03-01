# Anime Watchlist + Recommendation App

Full-stack web app to track anime, manage a watchlist, rate completed shows, and receive personalized recommendations.

## Project Status

Current phase: `Phase 6 - Release`

See `docs/ROADMAP.md` for full phase plan from MVP to GitHub release.

## Monorepo Layout

```text
apps/
  api/        # Express TypeScript API
  web/        # React + Vite frontend
packages/
  shared/     # Shared types and contracts
docs/
  ROADMAP.md
```

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express, TypeScript
- Database: SQLite (file-backed) with SQL migrations
- Shared: Local workspace package for shared app types
- Anime data provider: Jikan API (MyAnimeList data)
- Build: TypeScript project references

## Getting Started

Prerequisite: Node.js 20+ and npm 10+.

1. Install dependencies:

```bash
npm install
```

2. Start both apps in dev mode:

```bash
npm run dev
```

Optional (explicit migration run):

```bash
npm run db:migrate -w @anime-app/api
```

3. Open:
- Web: `http://localhost:5173`
- API: `http://localhost:4000/health`

## Scripts

- `npm run dev` - run web and API together
- `npm run dev:web` - run frontend only
- `npm run dev:api` - run backend only
- `npm run db:migrate -w @anime-app/api` - apply DB migrations and seed demo user
- `npm run lint` - run ESLint across workspaces
- `npm run test` - run API unit/integration/e2e test suite
- `npm run build` - build all workspaces
- `npm run typecheck` - run TypeScript checks

## Authentication Endpoints

- `POST /auth/signup` with `{ email, username, password }`
- `POST /auth/login` with `{ email, password }`
- `GET /auth/me` with `Authorization: Bearer <token>`
- `POST /auth/logout`

## Watchlist Endpoints (Protected)

- `GET /watchlist`
- `POST /watchlist` with `{ animeId, status? }`
- `PATCH /watchlist/:animeId` with `{ status?, rating?, notes?, progressEpisodes? }`
- `DELETE /watchlist/:animeId`

## Recommendation Endpoints

- `GET /recommendations/preview`
- `GET /recommendations/personalized` (protected)

## Discovery Endpoint

- `GET /catalog?q=&genre=&minRating=&maxEpisodes=&sort=`
- Supported `sort`: `rating_desc`, `rating_asc`, `title_asc`
- `animeId` values now map to MyAnimeList IDs from Jikan

## CI/CD and Release

- GitHub Actions workflow: `.github/workflows/ci.yml`
- Deployment guide: `docs/DEPLOYMENT.md`
- Release checklist: `docs/RELEASE.md`
- Changelog: `CHANGELOG.md`

Local demo account:
- Email: `demo@anime.app`
- Password: `password123`

## Phase Plan

- Phase 1: Foundation and architecture
- Phase 2: Authentication + user profiles (completed baseline)
- Phase 3: Watchlist CRUD + ratings (completed baseline)
- Phase 4: Recommendation engine (completed baseline)
- Phase 5: Search/discovery UX and polish (completed baseline)
- Phase 6: Test hardening, CI/CD, docs, and GitHub release (completed baseline)

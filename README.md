# Anime Watchlist + Recommendation App

Full-stack web app to track anime, manage a watchlist, rate completed shows, and receive personalized recommendations.

## Project Status

Current phase: `Phase 5 - Quality and Product Polish`

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
- Shared: Local workspace package for shared app types
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

3. Open:
- Web: `http://localhost:5173`
- API: `http://localhost:4000/health`

## Scripts

- `npm run dev` - run web and API together
- `npm run dev:web` - run frontend only
- `npm run dev:api` - run backend only
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

Local demo account:
- Email: `demo@anime.app`
- Password: `password123`

## Phase Plan

- Phase 1: Foundation and architecture
- Phase 2: Authentication + user profiles (completed baseline)
- Phase 3: Watchlist CRUD + ratings (completed baseline)
- Phase 4: Recommendation engine (completed baseline)
- Phase 5: Search/discovery UX and polish (completed baseline)
- Phase 6: Test hardening, CI/CD, docs, and GitHub release

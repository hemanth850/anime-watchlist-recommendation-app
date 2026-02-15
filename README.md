# Anime Watchlist + Recommendation App

Full-stack web app to track anime, manage a watchlist, rate completed shows, and receive personalized recommendations.

## Project Status

Current phase: `Phase 2 - Authentication`

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

Local demo account:
- Email: `demo@anime.app`
- Password: `password123`

## Phase Plan

- Phase 1: Foundation and architecture
- Phase 2: Authentication + user profiles (in progress)
- Phase 3: Watchlist CRUD + ratings
- Phase 4: Recommendation engine (content-based baseline)
- Phase 5: Search/discovery UX and polish
- Phase 6: Test hardening, CI/CD, docs, and GitHub release

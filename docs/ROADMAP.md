# Roadmap

## Phase 1 - Foundation

Goal: establish architecture, local dev workflow, and shared contracts.

- [x] Monorepo setup with `apps/web`, `apps/api`, `packages/shared`
- [x] Baseline API with health endpoint and recommendation placeholder
- [x] Baseline frontend connected to API
- [x] Core README and phased plan

Exit criteria:
- Team can run both apps locally.
- Shared types are consumed by API and web.

## Phase 2 - Authentication

Goal: add user accounts and session management.

- [x] User model and persistence layer (in-memory baseline)
- [x] Signup/login/logout endpoints
- [x] Frontend auth flows
- [x] Protected routes

Exit criteria:
- User can create account and log in.

## Phase 3 - Watchlist + Ratings

Goal: provide core watchlist functionality.

- [x] Add anime catalog integration or seed data
- [x] Watchlist CRUD endpoints
- [x] Status transitions (`plan`, `watching`, `completed`, `dropped`)
- [x] Ratings and notes

Exit criteria:
- User can fully manage their anime list.

## Phase 4 - Recommendation Engine

Goal: generate recommendations from user behavior.

- [x] Baseline recommendation algorithm
- [x] Recommendation API endpoints
- [x] Explainability metadata (why recommended)
- [x] Frontend recommendation views

Exit criteria:
- User sees recommendations that react to ratings/status history.

## Phase 5 - Quality and Product Polish

Goal: improve UX, reliability, and observability.

- [x] Advanced search and filters
- [x] Error handling improvements and loading states
- [x] API validation and improved logging
- [ ] Analytics events and app metrics (optional)

Exit criteria:
- Stable and polished MVP experience.

## Phase 6 - Release

Goal: production-ready workflow and GitHub release.

- [x] Unit/integration/e2e test coverage baseline
- [x] GitHub Actions CI (lint + typecheck + tests + build)
- [x] Deployment configs (web + API)
- [x] Release notes and version tag

Exit criteria:
- Tagged release on GitHub with deployment instructions and changelog.

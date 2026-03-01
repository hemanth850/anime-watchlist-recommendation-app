# Deployment Guide

## Option 1: Docker Compose (Local/Server)

1. Build and run:
```bash
docker compose up --build
```

2. Access:
- Web: `http://localhost:5173`
- API: `http://localhost:4000/health`

## Option 2: Split Deployment

### API Service
- Build command:
```bash
npm ci && npm run build -w @anime-app/shared && npm run build -w @anime-app/api
```
- Start command:
```bash
npm run start -w @anime-app/api
```
- Required env:
  - `PORT`
  - `SESSION_SECRET`
  - `DATABASE_PATH` (SQLite file path)

### Web Service
- Build command:
```bash
npm ci && npm run build -w @anime-app/shared && npm run build -w @anime-app/web
```
- Preview command:
```bash
npm run preview -w @anime-app/web -- --host 0.0.0.0 --port 5173
```
- Required env at build time:
  - `VITE_API_BASE_URL` (public API URL)

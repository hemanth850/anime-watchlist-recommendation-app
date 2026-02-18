FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/web/package*.json apps/web/
COPY packages/shared/package*.json packages/shared/

RUN npm install

COPY . .

ARG VITE_API_BASE_URL=http://localhost:4000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build -w @anime-app/shared && npm run build -w @anime-app/web

EXPOSE 5173

CMD ["npm", "run", "preview", "-w", "@anime-app/web", "--", "--host", "0.0.0.0", "--port", "5173"]


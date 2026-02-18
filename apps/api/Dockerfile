FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/web/package*.json apps/web/
COPY packages/shared/package*.json packages/shared/

RUN npm install

COPY . .

RUN npm run build -w @anime-app/shared && npm run build -w @anime-app/api

EXPOSE 4000

CMD ["npm", "run", "start", "-w", "@anime-app/api"]


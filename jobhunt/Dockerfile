# Multi-stage build for the job-hunt cockpit.
#   Stage 1 (builder): install all deps + build the Vite client bundle.
#   Stage 2 (runtime):  slim image with prod deps + server + built dist.
# better-sqlite3 ships prebuilt binaries for linux/glibc, so no compiler is
# needed at runtime; the builder installs build-essential just in case a
# source build is triggered.

# ---- Stage 1: build ----
FROM node:20-bookworm AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- Stage 2: runtime ----
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Only production deps in the runtime image.
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# App code + built client + seed data.
COPY server ./server
COPY data ./data
COPY --from=builder /app/dist ./dist

EXPOSE 8080
CMD ["node", "server/index.js"]

# ---- base build env ----
FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock package-lock.json ./
# Install only prod deps first to maximize cache
RUN bun install --ci

# ---- build web (if you have /web with its own bun config) ----
FROM base AS webbuild
WORKDIR /app/web
COPY web/package.json ./
RUN bun install --ci
COPY web ./
RUN bun run build              # expects web/build or web/dist output

# ---- build server ----
FROM base AS serverbuild
WORKDIR /app
COPY . ./
# Bring in the built web assets if you serve them statically
COPY --from=webbuild /app/web/dist ./web/dist
# If you transpile TS, do it here
RUN bun x tsc --project tsconfig.json

# ---- runtime ----
FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Recommended for sharp on Debian slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

# Create non-root dir and copy artifacts
COPY --from=serverbuild /app/node_modules ./node_modules
COPY --from=serverbuild /app/package.json ./package.json
COPY --from=serverbuild /app/web/dist ./web/dist
COPY --from=serverbuild /app/src ./src
COPY --from=serverbuild /app/tsconfig.json ./tsconfig.json

# Healthcheck expects your server to reply on /
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/health || exit 1

EXPOSE 3000
# PRINTER_ADDR like "tcp://192.168.4.90:9100"
ENV PRINTER_ADDR="tcp://printer.local:9100"
CMD ["bun", "src/server.ts"]
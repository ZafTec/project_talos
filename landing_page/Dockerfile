FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Build the app
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Run check before build
RUN bun run check
RUN bun run build

# Production image
FROM oven/bun:1-slim AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321

CMD ["bun", "./node_modules/astro/bin/astro.js", "preview", "--host", "0.0.0.0", "--port", "4321"]

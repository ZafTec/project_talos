# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Install production dependencies only
RUN bun install --production

# Expose port
EXPOSE 4321

# Set environment
ENV NODE_ENV=production
ENV PORT=4321
ENV HOST=0.0.0.0

# Start the application
CMD ["bun", "./dist/server/entry.mjs"]
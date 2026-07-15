# Multi-stage build for the NestJS API.
FROM node:20-alpine AS base
# Prisma's engines need OpenSSL/libssl at build (generate) and runtime on Alpine.
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile=false

# ---- build ----
FROM base AS build
COPY --from=deps /app /app
COPY . .
RUN pnpm --filter @ppm/api prisma:generate \
 && pnpm --filter @ppm/api build

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["pnpm", "start:prod"]

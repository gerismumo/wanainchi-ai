ARG NODE_VERSION=22-slim

# ─── Stage 1: Base ───────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME/bin:$PATH

RUN pnpm add --global turbo

# ─── Stage 2: Prune ──────────────────────────────────────────────────────────
FROM base AS pruner

# Context must be the monorepo root:
# docker build -f apps/web/Dockerfile .
COPY . .
RUN turbo prune web --docker

# ─── Stage 3: Install ────────────────────────────────────────────────────────
FROM base AS installer

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY --from=pruner /app/out/full/ .

# ─── Stage 4: Build ──────────────────────────────────────────────────────────
FROM installer AS builder

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN echo "Building with NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"

WORKDIR /app/apps/web


RUN pnpm build

# ─── Stage 5: Production ─────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner

WORKDIR /app

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3001

CMD ["node", "apps/web/server.js"]
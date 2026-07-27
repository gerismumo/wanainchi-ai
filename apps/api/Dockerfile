ARG NODE_VERSION=22-slim

# ─── Stage 1: Base ───────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS base

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME/bin:$PATH

RUN corepack enable && corepack prepare pnpm@latest --activate

RUN pnpm add --global @upleveled/preflight@latest turbo

# ─── Stage 2: Prune ──────────────────────────────────────────────────────────
FROM base AS pruner

COPY . .
RUN turbo prune api --docker

# ─── Stage 3: Install ────────────────────────────────────────────────────────
FROM base AS installer

COPY --from=pruner /app/out/json/ .

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY --from=pruner /app/out/full/ .

# ─── Stage 4: Build ──────────────────────────────────────────────────────────
FROM installer AS builder

RUN pnpm turbo run build

# ─── Stage 5: Production ─────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner

WORKDIR /app

COPY --from=builder /app .

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
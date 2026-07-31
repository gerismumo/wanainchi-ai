# Wananchi AI

A citizen-reporting platform for Kenya. Residents submit reports — text, voice, or photo — in any language, no account required. Gemini AI classifies each report, detects location from content, filters spam, and periodically generates community digests so local issues surface to the people who can act on them.

Licensed under the [Apache License 2.0](./LICENSE).

---

## Stack

| Layer | Technology |
|---|---|
| API | NestJS 11, Knex, PostgreSQL 16 |
| Web | Next.js 16, React 19, Tailwind CSS 4 |
| AI | Google Gemini (`@google/genai`) |
| Storage | MinIO (S3-compatible) |
| Monorepo | Turborepo + pnpm workspaces |

---

## Project layout

```
.
├── apps
│   ├── api          # NestJS REST API  →  http://localhost:3000
│   └── web          # Next.js frontend →  http://localhost:3001
├── packages
│   ├── @repo/ui               # Shared React component stubs
│   ├── @repo/eslint-config    # ESLint presets
│   ├── @repo/jest-config      # Jest presets
│   └── @repo/typescript-config  # tsconfig bases
├── docker
│   └── postgres/init.sql      # Creates dev + test databases
├── docker-compose.dev.yml     # Local infrastructure (Postgres + MinIO)
└── docker-compose.prod.yml    # Production stack
```

---

## Prerequisites

- **Node.js** ≥ 18  
- **pnpm** 8.15.5 — `npm install -g pnpm@8.15.5`  
- **Docker** + **Docker Compose** (for local Postgres & MinIO)  
- A **Google Gemini API key** — [get one here](https://aistudio.google.com/app/apikey)

---

## Getting started

### 1 — Clone & install dependencies

```bash
git clone <repo-url> wanainchi-ai
cd wanainchi-ai
pnpm install
```

### 2 — Start local infrastructure

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts:
- **PostgreSQL 16** on `localhost:5432` (user `postgres`, password `postgres`)
- **MinIO** S3 API on `localhost:9000`, console at `http://localhost:9001` (user `minioadmin`, password `minioadmin`)

The `init.sql` script automatically creates `wananchiai_dev` and `wananchiai_test` databases on first run.

### 3 — Configure environment variables

**API** — copy and fill in `apps/api/.env`:

```bash
cp apps/api/.env.example apps/api/.env
```

```env
# App
NODE_ENV=development
HOST_NAME=localhost
PORT=3000
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# Database
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_PORT=5432
DB_NAME_DEV=wananchiai_dev
DB_NAME_TEST=wananchiai_test
DB_NAME_PROD=wananchiai_prod

# MinIO (matches docker-compose.dev.yml defaults)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USESSL=false
MINIO_ACCESSKEY=minioadmin
MINIO_SECRETKEY=minioadmin
MINIO_BUCKET_DEV=reports-dev
MINIO_BUCKET=reports
MINIO_PUBLIC_URL=http://localhost:9000

# CORS
CORS_DEV_ORIGINS=http://localhost:3001

# AI
GEMINI_API_KEY=your_gemini_api_key_here
```

**Web** — copy and fill in `apps/web/.env`:

```bash
cp apps/web/.env.example apps/web/.env
```

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4 — Run database migrations

```bash
cd apps/api
pnpm migrate:latest
```

To also seed sample data:

```bash
pnpm seed:run
```

### 5 — Start the development servers

From the repo root:

```bash
pnpm dev
```

Turborepo starts both apps in parallel:

| App | URL |
|---|---|
| API | http://localhost:3000 |
| Web | http://localhost:3001 |

---

## Common commands

Run from the **repo root** unless noted.

```bash
# Development
pnpm dev                   # Start all apps with hot-reload

# Build
pnpm build                 # Build all apps and packages

# Test
pnpm test                  # Unit tests across all packages
pnpm test:e2e              # End-to-end tests

# Lint & format
pnpm lint
pnpm format

# Database (run from apps/api)
pnpm migrate:latest        # Apply pending migrations
pnpm migrate:rollback      # Roll back last migration
pnpm migrate:status        # Show migration state
pnpm migrate:make <name>   # Create a new migration file
pnpm seed:run              # Run seeders
pnpm db:reset              # Rollback all → migrate → seed
```

---

## API modules

| Module | Responsibility |
|---|---|
| `reports` | Submit and query citizen reports (text / voice / photo) |
| `digests` | AI-generated community summaries by location and period |
| `analytics` | Aggregated stats and category breakdowns |
| `auth` | Email / password authentication, JWT |
| `users` | User profiles and device management |
| `devices` | Fingerprint-based device trust scoring |
| `votes` | Up/down votes on reports |
| `ai` | Gemini integration — text analysis, transcription, image analysis |
| `storage` | MinIO file upload and URL generation |
| `abuse-logs` | Spam and rate-limit audit trail |

All routes are prefixed with `/api`.

---

## Docker

### Development (infrastructure only)

```bash
# Start Postgres + MinIO
docker compose -f docker-compose.dev.yml up -d

# Stop
docker compose -f docker-compose.dev.yml down

# Wipe volumes (fresh start)
docker compose -f docker-compose.dev.yml down -v
```

### Production

Builds are triggered automatically on push to `main` via the GitHub Actions workflow in `.github/workflows/deploy.yml`. The workflow builds both Docker images, runs a health check, and rolls back automatically on failure.

To build and run locally with the production compose file:

```bash
# Build images
docker compose -f docker-compose.prod.yml build

# Start stack
docker compose -f docker-compose.prod.yml up -d
```

Production env files are expected at:

```
/home/apps/wananchiai/.env          # Postgres + MinIO root credentials
/home/apps/wananchiai/api/.env      # API env
/home/apps/wananchiai/web/.env      # Web env (NEXT_PUBLIC_API_URL)
```

---

## Contributing

1. Fork the repository and create a branch from `main`.
2. Make your changes with tests where applicable.
3. Open a pull request — GitHub Issues will be closed without action.

---

## License

[Apache License 2.0](./LICENSE)

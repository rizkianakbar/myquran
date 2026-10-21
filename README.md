# myQuran

A calm Quran reader with word-by-word meanings, tafsir, recitation, and personal notes and bookmarks.

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19, TanStack Router, server functions) on Vite + Nitro
- **Data:** TanStack Query, Drizzle ORM, PostgreSQL
- **Auth:** Better Auth (email + password)
- **Tooling:** Bun, Biome, `tsgo`, Vitest
- **Hosting:** Vercel

## Prerequisites

- Node.js 24+ and Bun 1.3+ (see `engines` / `packageManager` in `package.json`)
- A [Supabase](https://supabase.com) project for development (Postgres 18+, since the schema uses `uuidv7()`)

## Quick Start

```bash
bun install
cp .env.example .env.local   # then set DATABASE_URL to your Supabase dev project
bun db:migrate
bun db:seed
bun dev                      # http://localhost:3000
```

Sign in with `test@example.com` / `password123` (created by the seed).

## Project Structure

```
src/
├── routes/              # File-based routes (pages + /api/auth/$ server route)
├── components/          # App components; ui/ is the shadcn-style kit
├── lib/                 # Client code: stores, player, i18n, Quran data loaders
├── db/                  # Drizzle schema + relations
├── server/              # Server code
│   ├── *.server.ts      #   server-only (db, auth, env, data access)
│   └── *.functions.ts   #   server functions + query options (callable from the client)
├── router.tsx           # Router + per-request QueryClient
└── start.ts             # Start config: client-rendered routes, CSRF middleware
drizzle/                 # SQL migrations (generated)
public/quran/            # Static Quran text, translations, tafsir (JSON)
scripts/                 # seed.ts, fetch-quran.ts
```

## Commands

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `bun dev`           | Dev server on port 3000                            |
| `bun run build`     | Production build (`.output/`)                      |
| `bun check`         | Biome format + lint (auto-fix) and type-check      |
| `bun run test`      | Vitest (runs in rolled-back transactions)          |
| `bun db:generate`   | Generate a SQL migration from schema changes       |
| `bun db:migrate`    | Apply pending migrations                           |
| `bun db:push`       | Push schema without a migration (prototyping only) |
| `bun db:seed`       | Truncate and reseed the dev DB                     |
| `bun db:studio`     | Drizzle Studio on port 4444                        |
| `bun quran:fetch`   | Download Quran content into `public/quran/`        |
| `bun ui add <name>` | Add a shadcn component into `src/components/ui/`   |

## Deploying to Vercel

1. Import the repo in Vercel; `vercel.json` sets the TanStack Start framework preset and Bun install.
2. Create a production Supabase project (Postgres 18+, since the schema uses `uuidv7()`). In its settings, turn off the Data API: the app talks to Postgres directly, and leaving the API on would expose the `public` tables (users, sessions, accounts) over REST.
3. Set environment variables:
   - `DATABASE_URL` — Supabase **transaction pooler** URL (port 6543). The direct `db.<ref>.supabase.co` host is IPv6-only, and Vercel can't reach it
   - `BETTER_AUTH_SECRET` — 32+ random chars (`openssl rand -hex 32`)
   - `BETTER_AUTH_URL` — production origin, e.g. `https://myquran.vercel.app` (optional; inferred per request when unset, which keeps preview deployments working)
4. Run migrations against the production database before (or right after) deploying:

   ```bash
   DATABASE_URL=<production session-pooler url> bun db:migrate
   ```

   Migrations are deliberately not run in the Vercel build, so preview builds can't change the production schema.

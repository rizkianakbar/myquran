# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is Bun (`bun.lock`); all commands are `package.json` scripts. There's no local database server: `DATABASE_URL` in `.env.local` (copy `.env.example`) points at a Supabase dev project (use the pooler hosts; the direct host is IPv6-only). Supabase is used as plain Postgres only, with no supabase-js and no Data API. Vite, `vitest.config.ts` and `drizzle.config.ts` each load `.env.local`; Bun loads it for `scripts/*.ts`.
- `bun dev` — TanStack Start dev server on port 3000 (`--strictPort`: fails rather than drifting to another port)
- `bun check` — Biome format+lint (auto-fixes, `--write --unsafe`) + `tsgo --noEmit`
- `bun run test` — Vitest (note: `bun test` runs Bun's own runner, not Vitest)
- `bun run build` — production build into `.output/` (Nitro; picks the Vercel preset automatically on Vercel)
- `bun db:generate` — SQL migration from schema changes into `drizzle/` · `bun db:migrate` · `bun db:push` (prototyping) · `bun db:studio` (port 4444)
- `bun db:seed` — truncate and reseed (`test@example.com` / `password123`, plus a few bookmarks/notes)
- `bun quran:fetch` — download Quran content into `public/quran/`

Single test file: `bun vitest run src/server/annotations.test.ts`.

## Architecture

TanStack Start app (React 19 + TanStack Router + server functions), deployed to Vercel. One `package.json`, one source tree. Import alias `#/*` → `./src/*` (declared in `package.json` `imports` and mirrored in `tsconfig.json` `paths`); always use it across directories, and keep explicit `.ts`/`.tsx` extensions.

There is no separate API server: the backend is TanStack Start server functions plus one server route for Better Auth.

### Rendering

`src/start.ts` sets `defaultSsr: false`: the document shell and `<head>` (`shellComponent` in `src/routes/__root.tsx`) are server-rendered, but route components render on the client because the reader depends on per-device state in localStorage (theme, language, translation, progress). An inline script in `__root.tsx` applies the saved theme before first paint. Module-level code in `src/lib/` is still imported on the server, so guard browser globals (`typeof window !== 'undefined'`).

### Server code (`src/server/`)

File naming is load-bearing:
- `*.server.ts` — server-only. Start's import protection blocks these from the client bundle. `env.server.ts` (Zod-validated env; dev defaults, production requires `DATABASE_URL` and `BETTER_AUTH_SECRET`), `db.server.ts` (pg `Pool` + Drizzle, `attachDatabasePool` for Vercel), `auth.server.ts` (Better Auth), and data access like `notes.server.ts` — plain `(db, userId, ...)` functions, so ownership checks live in one place and tests call them directly.
- `*.functions.ts` — `createServerFn` wrappers plus `queryOptions` factories. Safe to import from components: the compiler strips handler bodies (and their `.server.ts` imports) from the client build. Protected functions use `authMiddleware` (`middleware.ts`), which resolves the Better Auth session from request headers and provides `context.user`, or responds 401.
- `schemas.ts` — shared Zod input schemas (client-safe).

Pattern for a new feature: table in `src/db/schema.ts` (+ `relations.ts`) → data access in `src/server/<x>.server.ts` → server fns + `<x>Queries` in `src/server/<x>.functions.ts` → components use `useQuery(<x>Queries.list())` and `useMutation({ mutationFn: useServerFn(fn) })`, invalidating `<x>Queries.all` on success. See notes/bookmarks.

`src/start.ts` also installs `createCsrfMiddleware` for server-function requests (cross-site calls get 403; page navigations are unaffected).

### Auth

Better Auth, email+password only, mounted at `/api/auth/*` by `src/routes/api/auth/$.ts` — same origin as the app, so no CORS. Client: `authClient` from `src/lib/auth-client.ts` (`authClient.useSession()` in components). In route `beforeLoad`s use the `getSession` server fn (`src/server/auth.functions.ts`). The `auth_users`/`auth_sessions`/`auth_accounts`/`auth_verifications` tables (exported from the schema as `users`/`sessions`/`accounts`/`verifications`, the keys the adapter looks up with `usePlural`) follow Better Auth's schema, and Better Auth checks it at startup (`SCHEMA_MISMATCH` errors), so don't rename their columns casually.

### Database

Table names are prefixed by domain: `auth_*` for Better Auth, `quran_*` for app data (snake_case, so no quoting needed); the TypeScript exports stay unprefixed. Drizzle ORM 1.0 RC over Postgres (`uuidv7()` defaults; built into 18, polyfilled on older servers like Supabase 17 by `scripts/uuidv7-polyfill.ts`, which `bun db:migrate` runs first). Relations use `defineRelations`; in 1.0 `drizzle()` takes `relations` only (no `schema`), and Better Auth's adapter gets `schema` explicitly. Migrations are in `drizzle/<timestamp>_<name>/` (`migration.sql` + `snapshot.json`) and are tracked in the `schema_migrations` table. Never hand-edit them; regenerate with `bun db:generate`.

### Testing

`src/test/database.ts`'s `serverTest` (a Vitest fixture) runs each test against the real database (`DATABASE_URL`, so migrate it first) inside a transaction that is always rolled back: no mocks, and nothing is committed. Data-access functions accept `Database` (the db or a transaction) for this reason. Test the `*.server.ts` functions directly with the `db` fixture; `createTestUser(db)` makes a user with a unique email so tests don't collide with seeded or concurrent rows. `vitest.config.ts` is deliberately separate from `vite.config.ts` so tests don't boot the Start/Nitro plugins.

### Frontend

File-based routes in `src/routes/`; `src/routeTree.gen.ts` is generated, never hand-edit it. The router (`src/router.tsx`) creates a fresh `QueryClient` per request and passes it as router context. Quran content is static JSON under `public/quran/`, loaded by `src/lib/quran/data.ts` and cached long by `vercel.json` headers.

### Design system (`src/components/ui/`)

A small shadcn-style kit (`Button`, `Card`, `Badge`, `Input`, `Textarea`, `Drawer`) built on `class-variance-authority` + Base UI + Tailwind v4. All color tokens are OKLCH CSS variables in `src/styles.css`, monochrome by design, so don't hardcode colors. Extend via `cn()` (`src/lib/utils.ts`) and the existing `variant`/`size` props. `components.json` is at the root; add components with `bun ui add <component>` (writes into `src/components/ui/`), then `bun check` reformats them to this repo's Biome style.

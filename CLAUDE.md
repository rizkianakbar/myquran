# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Setup and dev loop (uses `mise` as the task runner; package manager is Bun — `bun.lock`, no npm/yarn lockfiles):

- `mise setup` — install deps (`bun i --frozen-lockfile`)
- `mise up` — start Postgres via Docker, run migrations, seed the dev DB
- `mise reset` — `mise down` + `mise up` (wipes and rebuilds the dev DB from scratch)
- `mise dev` — run the API (port 3001) and dashboard (port 3000) together in watch mode
- `mise check` — Biome format+lint (auto-fixes, `--write --unsafe`) + `tsgo` type-check for both `api` and `app`
- `mise test` — `bun vitest run` (all `**/*.test.ts`, root `vite.config.ts` excludes `app/`)
- `mise studio` — Drizzle Studio on port 4444
- `mise down` / `mise clean` — stop Docker services / remove `node_modules` and logs

API CLI (`mise api <cmd>`, dispatches through `api/primitives/cli.ts` via `api/main.ts`):

- `mise api start` — start the Express server directly (no watch)
- `mise api db:gen` — generate a SQL migration from schema changes (drizzle-kit)
- `mise api db:migrate` — apply pending migrations
- `mise api db:push` — push schema directly, no migration file (fast prototyping)
- `mise api db:seed` — truncate and reseed (creates `test@example.com` / `password123`, an API key, and demo data)

Single test file: `bun vitest run path/to/file.test.ts`. Tests need Docker Postgres running (`mise up` first) — each test gets its own throwaway database cloned from a cached template (`api/primitives/database.ts`), not mocks.

**Port gotcha**: the dashboard's CORS allowlist (`api/primitives/server.ts`) only accepts the exact origin in `DASHBOARD_URL` (default `http://localhost:3000`). If port 3000 is already taken, Vite silently falls back to 3001/3002/etc., and every API request then fails with an opaque "Failed to fetch" instead of a CORS error message. If that happens, find and kill whatever's holding 3000/3001 rather than letting Vite pick a fallback port.

## Architecture

Single root `package.json` (no workspaces) with three source trees, each with its own Node subpath import alias declared once in the root `package.json` (`"imports": { "#*": "./*" }`) — always import across trees with these, never with relative paths:

- `api/` → `#api/*` — Express backend (tRPC + OpenAPI-style REST)
- `app/` → `#app/*` — React SPA (TanStack Router + tRPC client)
- `assets/` → `#assets/*` — shared UI components and design tokens

### Backend (`api/`)

An IoC-style container (`api/primitives/container.ts`) builds `{ auth, config, db, logger }` once at boot; that `container` (or the request-scoped `AppContext` built from it) is threaded explicitly through every layer — there's no DI framework.

Two API surfaces sit side by side and share the same business logic:

- **tRPC** (`api/trpc/`) — session-cookie auth for the dashboard SPA. `protectedProcedure` (`trpc/init.ts`) throws `UNAUTHORIZED` unless `ctx.session`/`ctx.user` are set.
- **OpenAPI-style REST** (`api/routes/v1+/...`) — `X-Api-Key`-header auth for external consumers. Routes are discovered by folder convention, not hand-registered: `api/primitives/openapi.ts` walks `api/routes/` at boot and maps remix-flat-routes-style folders (`segment+/`, `$param+/`) to Express paths — e.g. `v1+/posts+/$id+/index.ts` → `/v1/posts/:id`. Each `index.ts` default-exports `defineOpenAPI({ GET/POST/...: defineOpenAPIEndpoint({ params, query, requestBody, responses, handler }) })`, which gets Zod validation and typed `response.ok()/notFound()/...` builders for free.

Both surfaces resolve to one `AppContext` (`api/primitives/app-context.ts`: `{ apiKey, container, request, session, user }`). tRPC requests fetch the session via Better Auth (`fetchSession: true`); OpenAPI requests instead get `apiKey` populated by `api/middleware/api-key-auth.ts` (SHA-256 hash lookup against `api_keys`, mounted only under `/v1`, skipping `/v1/webhooks/*` since providers don't have your API keys). Compare `api/routes/v1+/posts+/$id+/index.ts` (checks `ctx.apiKey`) against `api/trpc/posts.ts` (checks `ctx.user`) for the two idioms side by side.

Business logic lives in `api/services/*.ts` as plain `(ctx: AppContext, ...)` functions — both the tRPC router and the OpenAPI handler call the same service function, so things like ownership checks are written once (see `api/services/posts.ts`).

Auth is Better Auth (`api/primitives/auth.ts`), email+password only, via the Drizzle adapter over the same Postgres DB — `users`/`sessions`/`accounts`/`verifications` in `api/databases/schema.ts` follow Better Auth's expected shape, so don't rename their columns casually.

Database is Drizzle ORM over Postgres. `api/databases/schema.ts` is the single source of truth for tables; `api/databases/relations.ts` uses the newer `defineRelations` API (not the legacy `relations()` helper) and must be passed into `drizzle()` alongside `schema` everywhere a `Database` is built (`container.ts` and `lib/testing/utils.ts`) — update both together when adding a table. Migrations live under `api/databases/schema_migrations/<timestamp>_<name>/` (`migration.sql` + `snapshot.json`) — never hand-edit these; regenerate with `mise api db:gen` after a schema change.

`api/routes/v1+/webhooks+/` demonstrates inbound webhooks: `api/primitives/server.ts`'s `rawBodyMiddleware` buffers the raw body for any `/webhooks/` path before JSON parsing (for signature verification), which is also why the API-key middleware explicitly skips those paths.

`api/primitives/config.ts` is a single Zod-validated `process.env` schema with dev defaults baked in — there's no `.env.example` to keep in sync; the schema is the contract. `DASHBOARD_URL`/`API_URL` (default `localhost:3000`/`3001`) double as both Better Auth's `trustedOrigins` and the hand-rolled CORS check in `server.ts`.

CLI commands (`api/commands/*.ts`) are plain `defineCommand({ name, description, run(args, container) })` objects registered in `api/commands/index.ts` and dispatched by a small custom CLI (`api/primitives/cli.ts`). Both `mise api <cmd>` and the `mise dev` watch process (`main.ts start`) go through this.

### Testing (`api/**/*.test.ts`)

`api/lib/testing/utils.ts`'s `serverTest` (a Vitest fixture) gives each test a **real, isolated Postgres database**, cloned from a cached template via `CREATE DATABASE ... WITH TEMPLATE` (`api/primitives/database.ts`) and dropped after — not mocks. Use `defineTestAppContext(container, { user, session, apiKey })` to build a fake `AppContext` for calling service functions directly. Tests replicate router/handler logic inline with small local helpers (see `callGetById`/`callDelete` in `api/trpc/posts.test.ts`) rather than instantiating a full tRPC caller — follow that pattern for new procedures.

### Frontend (`app/`)

TanStack Router, file-based (`app/src/routes/*.tsx`), generated into `app/src/routeTree.gen.ts` by the Vite plugin — never hand-edit that file. `_authenticated.tsx` is a pathless layout route that guards everything under it via `beforeLoad` (redirects to `/login` without a session); new authenticated pages go in `_authenticated.<name>.tsx`.

Data fetching is tRPC over `@tanstack/react-query` (`app/src/lib/trpc.tsx`), pointed at `http://localhost:3001/trpc` with `credentials: 'include'` so the session cookie rides along. Auth state comes from `better-auth/react`'s `authClient` (`app/src/lib/auth.ts`) — use `authClient.useSession()` in components for the current user rather than threading route context.

### Design system (`assets/components/ui/`)

A small shadcn-style kit (`Button`, `Card`, `Badge`, `Input`, `Table`, `Textarea`) built on `class-variance-authority` + BaseUI + Tailwind, with all color tokens as OKLCH CSS variables in `app/src/main.css` — monochrome/neutral by design, no hardcoded colors. Extend these via the `cn()` merge helper (`assets/lib/utils.ts`, which re-exports the `cn` package — the official shadcn class-merge utility) and existing `variant`/`size` props rather than one-off Tailwind classes.

`components.json` lives at the repo root (not `app/`) — the shadcn CLI requires a `package.json` next to it to recognize an existing project, and this repo only has one at the root. Its aliases point at `#assets/*`, resolved via the `paths` entries in the root `tsconfig.json` (the CLI reads tsconfig `paths` for alias resolution; the real runtime resolution still goes through the `imports` field in `package.json`, as everywhere else — these two are redundant on purpose). Use `mise ui add <component>` (or `mise ui add` with no args for the interactive picker) instead of copy-pasting from the shadcn docs — it writes straight into `assets/components/ui/`, and `mise check` will reformat whatever it generates to match this repo's Biome style.

### The `posts` resource is a worked example

Schema, relations, service, tRPC router, two OpenAPI routes, a webhook, seed data, tests, and the `/posts` feed UI are all deliberately threaded through one `posts` resource so the full-stack pattern is visible end-to-end in one place. Copy this shape when adding a real resource rather than starting from scratch.

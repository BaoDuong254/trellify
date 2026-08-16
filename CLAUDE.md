# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all workspace packages (from root)
pnpm install

# Development — runs client (5173), API server (3000) AND the BullMQ worker in parallel
pnpm start:dev

# Run a single workspace (`fe`/`be`/`shared`/`ui` are aliases for `pnpm --filter=<pkg>`)
pnpm fe start:dev            # client only
pnpm be start:dev            # API server only (no worker)
pnpm be start:worker:dev     # worker only
pnpm be start:debug          # API server with --inspect=9229

# Lint / format / types
pnpm lint
pnpm lint:fix
pnpm format:fix
pnpm typecheck

# Unused files/exports/deps — runs on pre-commit AND in CI; a failure blocks the commit
pnpm knip
pnpm knip:production

# Production build (order matters — packages export from dist/)
pnpm pkg:build
pnpm apps:build
pnpm start:prod

# Guided conventional commit
pnpm cz
```

There is no automated test suite. API endpoints are exercised via the Postman collection at `postman/collections/Trellify.postman_collection.json`. CI (`.github/workflows/ci.yml`) runs lint → knip → knip:production → format check → pkg:build → apps:build → SonarCloud; there is no test step to add to.

## Monorepo Layout

pnpm workspaces + Turbo:

- `apps/client` — React 19 + Vite + SWC frontend
- `apps/server` — Express 5 + MongoDB + Socket.io + BullMQ backend (two entrypoints: `src/index.ts`, `src/worker.ts`)
- `packages/shared` — Zod schemas, socket event constants, logger (`@workspace/shared`)
- `packages/ui` — shadcn/ui + Tailwind primitives (`@workspace/ui`). Scaffolded but **not currently consumed by the client** — the client is MUI-based. Don't reach for it when building client UI unless explicitly asked.
- `packages/eslint` / `packages/typescript` — shared configs

`@workspace/shared` is consumed through built subpath exports only: `@workspace/shared/schemas/*` and `@workspace/shared/utils/*` (no root import). Because it resolves to `dist/`, run `pnpm pkg:build` after changing shared code if apps start reporting stale or missing exports.

### Adding a dependency

Versions are centralized via **pnpm catalog**. Never write a version number in a workspace `package.json`:

1. Add `<pkg>: <version>` under `catalog:` in `pnpm-workspace.yaml`
2. Reference it as `"<pkg>": "catalog:"` in the target workspace's `package.json`
3. Run `pnpm install` from the root

Internal packages skip the catalog and use `"workspace:*"`. `.npmrc` sets `save-exact=true` and `engine-strict=true`; a pre-commit hook (`scripts/check-lockfile.sh`) verifies the lockfile is in sync.

## Backend Architecture

Strict layered pattern: **Controller → Service → Model → Database**

- **Controllers** (`src/controllers/`) — thin HTTP handlers; call a service, send the response, pass errors to `next()`. No business logic.
- **Services** (`src/services/`) — all business logic; throw `ApiError` (`src/utils/api-error.ts`)
- **Models** (`src/models/`) — MongoDB access only; validate with Zod before insert/update; always filter `_destroy: false`
- **Validations** (`src/validations/`) — Zod middleware applied at the route level, using schemas from `@workspace/shared/schemas/*`
- **Providers** (`src/providers/`) — external service wrappers: Brevo (email), Cloudinary (uploads), JWT, Redis, Socket.io instance holder

MongoDB **native driver**, not Mongoose. Soft delete only — set `_destroy: true`, never hard-delete, never expose `_destroy` to the frontend. Prefer aggregation pipelines over N+1 queries.

Error messages are i18n keys (e.g. `"Error.BoardNotFound"`). Never expose stack traces in production.

### Real-time (Socket.io)

- Socket auth middleware (`src/sockets/auth.socket.ts`) runs on connection; every socket joins its own `user:<userId>` room, and board viewers join `board:<boardId>`. Room name helpers and all event name constants live in `@workspace/shared/utils/socket-events` — add new events there, never as string literals.
- REST mutations broadcast **after** `response.json()` via `broadcastBoardUpdate(request, boardId, reason)` from `src/sockets/board.broadcast.ts`. It re-fetches a board snapshot and emits `BE_BOARD_UPDATED` to the board room.
- The client echoes its socket id on every Axios request in the `x-socket-id` header (`SOCKET_ID_HEADER`); the broadcast uses `.except(actorSocketId)` so the originating tab doesn't double-apply its own change. Preserve this header plumbing when touching the HTTP client or broadcast helper.
- A Redis adapter (`@socket.io/redis-adapter`) backs Socket.io so broadcasts fan out across scaled instances — use adapter-aware APIs (`io.in(...).fetchSockets()`) rather than assuming a single process.

### Background jobs (BullMQ + Redis)

`src/worker.ts` is a **separate process** from the API server. Queues live in `src/queues/<domain>/` with a consistent four-file shape: `*.queue.ts` (producer), `*.worker.ts` (consumer), `*.processor.ts` (job logic), `*.interface.ts` (payload types). Queue names go in `src/queues/queue.constants.ts` and are namespaced by `QUEUE_PREFIX`. Redis is also used directly for rate limiting (`src/utils/rate-limiter.ts`).

Both entrypoints register `async-exit-hook` shutdown sequences (queue/adapter/Redis/Mongo) — extend those when adding a long-lived resource.

## Frontend Architecture

**Page → Container Component → Presentational Component → UI Primitive**

- **Pages** (`src/pages/`) — route components; connect to Redux, orchestrate data fetching
- **Components** (`src/components/`) — reusable UI built on MUI 7; style via the `sx` prop
- **Redux** (`src/redux/`) — Redux Toolkit slices: `activeBoard`, `user`, `activeCard`, `notifications`; only `user` is persisted to localStorage via redux-persist
- **APIs** (`src/apis/index.ts`) — Axios functions over the shared client in `src/utils/http.ts`
- **Real-time** — Socket.io client in `src/socketClient.ts`; board subscription lives in `src/hooks/useBoardSocket.ts`

Auth token refresh convention: the API returns **410 Gone** (not 401) for an expired access token. `http.ts` intercepts 410, refreshes once through a shared `refreshTokenPromise`, and replays the original request; a 401 means logout. Keep those two status codes distinct.

Drag-and-drop uses `@dnd-kit`; Markdown editing uses `@uiw/react-md-editor`; bot protection uses Cloudflare Turnstile (client widget + `src/middlewares/turnstile.middleware.ts` on the server).

## Critical Rules

**Imports** — absolute imports via the `src/*` alias; `@workspace/*` for internal packages; no deep relative paths (`../../../`).

**Type safety** — no `any` (use `unknown`); explicit return types everywhere; no `as` assertions unless unavoidable.

**Validation** — every Zod schema lives in `packages/shared/src/schemas/`; validate at both the route level (middleware) and the model level (before DB writes).

**Dead code** — knip runs on pre-commit and in CI. An exported symbol nobody imports, or a dependency nobody uses, will fail the build; delete it or wire it up rather than leaving it dangling.

**Security** — never expose password, tokens, or secrets in responses or logs; never bypass permission checks; always use env variables for secrets.

## Environment Variables

Copy the `.env.example` in both `apps/server/` and `apps/client/` to `.env`. Both apps validate env with Zod at startup (`apps/server/src/config/environment.ts`, `apps/client/src/config/env.ts`) and **throw on the first invalid or missing variable** — add any new variable to the schema and to `.env.example` together.

Server: `PORT`, `NODE_ENV`, `CLIENT_URL`, `MONGODB_URI`, `DATABASE_NAME`, `REDIS_URL`, `QUEUE_PREFIX`, `WORKER_CONCURRENCY`, `ACCESS_TOKEN_*` / `REFRESH_TOKEN_*` / `COOKIE_MAX_AGE`, `BREVO_API_KEY`, `ADMIN_EMAIL_*`, `CLOUDINARY_*`, `TURNSTILE_SECRET_KEY`.

Client: `VITE_API_ENDPOINT` (server origin, e.g. `http://localhost:3000`), `VITE_TURNSTILE_SITE_KEY` (dev test key: `1x00000000000000000000AA`).

## Git Conventions

Conventional Commits (`feat(scope): description`), enforced by commitlint on `commit-msg`. Hooks are managed by **lefthook** (`lefthook.yaml`) — pre-commit runs lockfile check, knip, prettier, and `lint:fix`. Branch naming: `feature/*`, `bugfix/*`, `hotfix/*` off `main`. Releases are automated by release-please.

## Related Instruction Files

`.github/copilot-instructions.md` carries the same architecture and critical rules in longer form; `.github/instructions/*.instructions.md` hold detailed React, TypeScript/ES2022, and Node.js conventions. Keep this file consistent with them when rules change.

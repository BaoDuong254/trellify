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

# CSP hashes for the client's inline scripts — pre-commit AND CI
bash scripts/check-csp-hashes.sh

# Production build (order matters — packages export from dist/)
pnpm pkg:build
pnpm apps:build
pnpm start:prod

# Guided conventional commit
pnpm cz
```

There is no unit/integration test suite and no test step to add to. Correctness is exercised three ways instead: the Postman collection (`postman/collections/Trellify.postman_collection.json`), the k6 load tests (below), and CI.

CI (`.github/workflows/ci.yml`) runs lint → knip → knip:production → format check → CSP hash check → pkg:build → apps:build → SonarCloud. There is no `typecheck` step — `apps:build` (`tsc -b` / `tsc --project tsconfig.build.json`) is what catches type errors in CI.

### Load testing (k6)

Runs against an isolated docker-compose stack built from the production Dockerfile, with its own MongoDB and Redis — it never touches real data. Requires Docker and `k6` on PATH.

```bash
pnpm loadtest:up      # build + start server/worker/mongo/redis (loadtest:up:multi = 3 replicas behind nginx)
pnpm loadtest:seed    # seed users/boards/cards, mint JWTs into k6/data/users.json
pnpm k6 smoke         # gate — 1 VU through every flow; if this fails, later numbers are meaningless
pnpm k6 mixed load    # main run; `pnpm k6` with no args prompts for scenario and profile
pnpm loadtest:down    # removes volumes too, so re-seed afterwards
```

`pnpm k6 <scenario> <profile>` is the single entrypoint for every run — scenarios are `smoke`, `mixed`, `board-read`, `board-write`, `auth`, `socket-fanout`; profiles are `smoke`, `baseline`, `load`, `stress`, `spike`, `soak`, `capacity`. `--prom` pushes to Prometheus, `--ts` writes a time-series file for `pnpm k6:peak-rps`, and any other flag is forwarded to `k6 run`.

`k6/README.md` documents the profiles, thresholds, and the Prometheus remote-write path.

## Monorepo Layout

pnpm workspaces + Turbo:

- `apps/client` — React 19 + Vite + SWC frontend
- `apps/server` — Express 5 + MongoDB + Socket.io + BullMQ backend (two entrypoints: `src/index.ts`, `src/worker.ts`)
- `packages/shared` — Zod schemas, socket event constants, logger (`@workspace/shared`)
- `packages/ui` — shadcn/ui + Tailwind primitives (`@workspace/ui`). Scaffolded but **not currently consumed by the client** — the client is MUI-based. Don't reach for it when building client UI unless explicitly asked.
- `packages/eslint` / `packages/typescript` — shared configs
- `infra/` — Kubernetes manifests reconciled by ArgoCD (see Deployment)
- `k6/` — load-test scenarios, profiles, and helpers (excluded from knip)

`@workspace/shared` is consumed through built subpath exports only: `@workspace/shared/schemas/*` and `@workspace/shared/utils/*` (no root import). Because it resolves to `dist/`, run `pnpm pkg:build` after changing shared code if apps start reporting stale or missing exports.

### Adding a dependency

Versions are centralized via **pnpm catalog**. Never write a version number in a workspace `package.json`:

1. Add `<pkg>: <version>` under `catalog:` in `pnpm-workspace.yaml`
2. Reference it as `"<pkg>": "catalog:"` in the target workspace's `package.json`
3. Run `pnpm install` from the root

Internal packages skip the catalog and use `"workspace:*"`. `.npmrc` sets `save-exact=true` and `engine-strict=true`; a pre-commit hook (`scripts/check-lockfile.sh`) verifies the lockfile is in sync.

## Backend Architecture

Strict layered pattern: **Controller → Service → Model → Database**

**File naming.** Layer folders hold one role per domain and repeat the folder name in the suffix: `controllers/board.controller.ts`, `services/board.service.ts`, also `models/`, `validations/`, `middlewares/`, `providers/`, `routes/`, `types/`. Subsystem folders hold several roles for the same domain and do **not** repeat the folder name - shared infra sits at the root as `<subsystem>.<role>.ts` and each domain gets its own subfolder of `<domain>.<role>.ts`. `queues/` and `sockets/` are the two subsystems:

```
queues/   queue.constants.ts  redis.client.ts   user/   user.queue.ts  user.worker.ts  user.processor.ts
sockets/  socket.server.ts    socket.auth.ts    board/  board.handlers.ts  board.broadcast.ts  board.viewers.ts
```

A new realtime domain is a new folder under `sockets/`, registered from `startSockets()` - don't flatten it back into the root.

- **Controllers** (`src/controllers/`) — thin HTTP handlers; call a service, send the response, pass errors to `next()`. No business logic. Get the authenticated user with `actorId(request)` from `src/utils/request-user.ts` — never read `request.jwtDecoded` inline.
- **Services** (`src/services/`) — all business logic; throw `ApiError` (`src/utils/api-error.ts`)
- **Models** (`src/models/`) — MongoDB access only; validate with Zod before insert/update; always filter `_destroy: false`
- **Validations** (`src/validations/`) — Zod middleware applied at the route level, using schemas from `@workspace/shared/schemas/*`
- **Providers** (`src/providers/`) — external service wrappers: Brevo (email), Cloudinary (uploads), JWT, Redis, Prometheus registry

MongoDB **native driver**, not Mongoose. Soft delete only — set `_destroy: true`, never hard-delete, never expose `_destroy` to the frontend. Prefer aggregation pipelines over N+1 queries.

Indexes are declarative: `ENSURE_INDEXES` in `src/config/indexes.ts` runs at startup against a single `INDEX_PLAN` array. Adding a new query pattern means adding its index there, not creating one by hand in the database.

Error messages are i18n keys (e.g. `"Error.BoardNotFound"`). Never expose stack traces in production.

### Real-time (Socket.io)

- Everything realtime lives in `src/sockets/`, behind one entry point: `startSockets(httpServer)` from `src/sockets/index.ts` creates the Socket.io server, attaches the Redis adapter, and registers the auth middleware and connection handlers in that order. `src/index.ts` only calls it and keeps the returned instance for the shutdown sequence - don't wire socket behaviour into the entrypoint again.
- Socket auth middleware (`src/sockets/socket.auth.ts`) runs on connection; every socket joins its own `user:<userId>` room, and board viewers join `board:<boardId>`. Room name helpers and all event name constants live in `@workspace/shared/utils/socket-events` — add new events there, never as string literals.
- REST mutations broadcast **after** `response.json()` via `broadcastBoardUpdate(request, boardId, reason)` from `src/sockets/board/board.broadcast.ts`. It re-fetches a board snapshot and emits `BE_BOARD_UPDATED` to the board room. Sends are serialised per board through the `inFlight` map so a slow snapshot query for an earlier update cannot land after a newer one — the client replaces the whole board on every payload, so an out-of-order emit rolls it backwards and it stays there.
- **Never gate a broadcast on adapter room membership.** `adapter.rooms`, `adapter.sockets()` and `adapter.hasRoom()` are all **local to one process** — `@socket.io/redis-adapter` does not override `sockets()` or `hasRoom()`, so they silently report only the sockets attached to the pod you are running on. Production runs 3-6 server replicas and the `/api` Ingress has no session affinity (only `/socket.io` does), so the pod handling a write is usually not the pod holding the viewers' sockets; a "nobody is watching, skip the emit" check built on those APIs drops most updates permanently. `board_broadcast_local_recipients` is safe to _observe_ for that reason but must never drive control flow. The only cross-node membership API is `io.in(room).fetchSockets()`, and that is a fan-out RPC that waits for every node with a 5s `requestsTimeout` — keep it off the write path.
- Whether anybody is watching a board is answered by a **Redis viewer registry** (`src/sockets/board/board.viewers.ts`), a set of socket ids per board under `bv:<boardId>`. `JOIN_BOARD` adds to it before acking, leave/disconnect/evict remove from it, and `emitBoardPresence` reconciles it from the `fetchSockets()` result it already fetches - removing only ids the adapter confirms are gone, never `DEL`-ing the key, so a concurrent join elsewhere cannot be clobbered. `broadcastBoardUpdate` skips the snapshot and emit when the registry holds nobody but the actor (`board_broadcast_skipped_total`); that is what keeps a solo user's writes, and a write-heavy load against unwatched boards, from costing a full board snapshot each. Three rules keep it safe: **never put a TTL on those keys** (a key expiring under live viewers reads back empty, which means "skip" - silent realtime loss); any Redis error means broadcast, never skip; and Redis losing the registry is repaired by `registerViewerRegistryRecovery`, which re-registers this instance's sockets on every reconnect.
- The client echoes its socket id on every Axios request in the `x-socket-id` header (`SOCKET_ID_HEADER`); the broadcast uses `.except(actorSocketId)` so the originating tab doesn't double-apply its own change. Preserve this header plumbing when touching the HTTP client or broadcast helper.
- A Redis adapter (`@socket.io/redis-adapter`) backs Socket.io so broadcasts fan out across scaled instances — use adapter-aware APIs (`io.in(...).fetchSockets()`) rather than assuming a single process.

### Background jobs (BullMQ + Redis)

`src/worker.ts` is a **separate process** from the API server. Queues live in `src/queues/<domain>/` with a consistent four-file shape: `*.queue.ts` (producer), `*.worker.ts` (consumer), `*.processor.ts` (job logic), `*.interface.ts` (payload types). Queue names go in `src/queues/queue.constants.ts` and are namespaced by `QUEUE_PREFIX`. Redis is also used directly for rate limiting (`src/utils/rate-limiter.ts`).

Both entrypoints register `async-exit-hook` shutdown sequences (metrics server/queue/adapter/Redis/Mongo) — extend those when adding a long-lived resource.

### Observability

Both the API server and the worker expose a Prometheus endpoint on a **second HTTP server** at `METRICS_PORT` (9464), separate from the app port — `startMetricsServer()` in `src/providers/metrics.provider.ts`. All custom metrics are declared in that one file against a single `Registry`; add new ones there and export them rather than creating a registry elsewhere. `src/middlewares/metrics.middleware.ts` records latency for every request, including ones that never match a route.

## Frontend Architecture

**Page → Container Component → Presentational Component → UI Primitive**

- **Pages** (`src/pages/`) — route components; connect to Redux, orchestrate data fetching
- **Components** (`src/components/`) — reusable UI built on MUI 7; style via the `sx` prop
- **Redux** (`src/redux/`) — Redux Toolkit slices: `activeBoard`, `user`, `activeCard`, `notifications`; only `user` is persisted to localStorage via redux-persist
- **APIs** (`src/apis/index.ts`) — Axios functions over the shared client in `src/utils/http.ts`
- **Real-time** — Socket.io client in `src/socketClient.ts`; board subscription lives in `src/hooks/useBoardSocket.ts`

Auth token refresh convention: the API returns **410 Gone** (not 401) for an expired access token. `http.ts` intercepts 410, refreshes once through a shared `refreshTokenPromise`, and replays the original request; a 401 means logout. Keep those two status codes distinct.

Drag-and-drop uses `@dnd-kit`; Markdown editing uses `@uiw/react-md-editor`; bot protection uses Cloudflare Turnstile (client widget + `src/middlewares/turnstile.middleware.ts` on the server).

`VITE_API_ENDPOINT` is deliberately **empty in production builds** — client and API share one host, so the browser calls `/api/v1/...` on its own origin and the Ingress routes it. Nothing in the bundle may hardcode a backend URL.

### CSP and inline scripts

`apps/client/nginx/security-headers.conf` pins a `script-src` allowlist of sha256 hashes for the inline `<script>` blocks in `apps/client/index.html`. Editing any inline script without updating those hashes ships a CSP that blocks the script and breaks the page — `scripts/check-csp-hashes.sh` (pre-commit and CI) fails with the exact hashes to paste in.

## Deployment

Production is a single-node k3s cluster; every manifest lives in `infra/` and **ArgoCD reconciles the cluster to `main`**. Nothing is applied by hand — changing production means committing to `infra/`, and a `kubectl` change is reverted by `selfHeal` within seconds. Rollback is `git revert` of the bump commit.

Pushing to `main` triggers `.github/workflows/build-k8s-images.yml`: it builds both images to `ghcr.io/baoduong254/trellify-{server,client}:sha-<short>`, then a second job runs `kustomize edit set image` in `infra/trellify/overlays/prod` and pushes a `chore(deploy): ... [skip ci]` commit. The `[skip ci]` marker is what stops that commit from triggering another build — don't remove it. `latest` is published but never deployed; the overlay always pins the immutable sha tag.

`infra/README.md` is the reference for the cluster: platform vs. application ArgoCD projects, SealedSecrets (and the master key that must be backed up outside the repo), the three Ingresses, the NetworkPolicy, and the MongoDB → R2 backup CronJob. Read it before touching anything under `infra/`.

`docker-compose*.yml` at the root are the legacy Compose deployment and the load-test stacks — not the production path.

## Critical Rules

**Imports** — absolute imports via the `src/*` alias; `@workspace/*` for internal packages; no deep relative paths (`../../../`).

**Type safety** — no `any` (use `unknown`); explicit return types everywhere; no `as` assertions unless unavoidable.

**Validation** — every Zod schema lives in `packages/shared/src/schemas/`; validate at both the route level (middleware) and the model level (before DB writes).

**Dead code** — knip runs on pre-commit and in CI. An exported symbol nobody imports, or a dependency nobody uses, will fail the build; delete it or wire it up rather than leaving it dangling.

**Security** — never expose password, tokens, or secrets in responses or logs; never bypass permission checks; always use env variables for secrets.

## Environment Variables

Copy the `.env.example` in both `apps/server/` and `apps/client/` to `.env`. Both apps validate env with Zod at startup (`apps/server/src/config/environment.ts`, `apps/client/src/config/env.ts`) and **throw on the first invalid or missing variable** — add any new variable to the schema and to `.env.example` together.

Server: `PORT`, `NODE_ENV`, `CLIENT_URL`, `MONGODB_URI`, `DATABASE_NAME`, `REDIS_URL`, `QUEUE_PREFIX`, `WORKER_CONCURRENCY`, `WORKER_HEALTH_PORT`, `METRICS_PORT`, `ACCESS_TOKEN_*` / `REFRESH_TOKEN_*` / `COOKIE_MAX_AGE`, `BREVO_API_KEY`, `ADMIN_EMAIL_*`, `CLOUDINARY_*`, `TURNSTILE_SECRET_KEY`.

Client: `VITE_API_ENDPOINT` (server origin in dev, e.g. `http://localhost:3000`; empty in production), `VITE_TURNSTILE_SITE_KEY` (dev test key: `1x00000000000000000000AA`).

In production these come from `infra/trellify/base/configmap-server.yaml` (non-sensitive) and SealedSecrets (everything else) — a new server variable needs adding in both places.

## Git Conventions

Conventional Commits (`feat(scope): description`), enforced by commitlint on `commit-msg`. Hooks are managed by **lefthook** (`lefthook.yaml`) — pre-commit runs lockfile check, CSP hash check, knip, prettier, and `lint:fix`. Branch naming: `feature/*`, `bugfix/*`, `hotfix/*` off `main`. Releases are automated by release-please.

## Further Reading

- `README.md` — setup, feature list, Postman usage, git workflow
- `infra/README.md` — cluster architecture, ArgoCD, secrets, backups, common kubectl operations
- `k6/README.md` — load-test scenarios, profiles, thresholds, Prometheus integration

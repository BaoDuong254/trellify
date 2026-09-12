# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all workspace packages (from root)
pnpm install

# Development — runs client (5173), API server (3000) AND the BullMQ worker in parallel
pnpm start:dev

# Run a single workspace (`fe`/`be`/`shared`/`e2e` are aliases for `pnpm --filter=<pkg>`)
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

### Tests

```bash
pnpm test                    # every Vitest suite (shared, server unit + integration, client) with coverage
pnpm shared test             # shared Zod schemas only
pnpm be test:unit            # server unit tests — no Docker needed
pnpm be test:integration     # server integration tests — needs Docker (Testcontainers starts mongo:8.0 + redis:8-alpine)
pnpm fe test                 # client (jsdom + Testing Library + MSW)

pnpm e2e:up                  # Mongo + Redis for Playwright (e2e/docker-compose.yml, ports 27019/6381)
pnpm test:e2e                # Playwright; starts its own API (3100) and Vite (5174) from e2e/e2e.env
pnpm e2e:down
```

CI (`.github/workflows/ci.yml`) runs lint → knip → knip:production → format check → CSP hash check → pkg:build → typecheck → apps:build → `pnpm test` → SonarCloud, and Playwright in a separate `e2e` job. The client's `typecheck` is `tsc -b`, not `tsc --noEmit`: its root `tsconfig.json` is solution-style (`"files": []` plus references to `tsconfig.app.json`/`tsconfig.node.json`), and plain `tsc --noEmit` only reads that root, checks zero files and exits 0. Only build mode follows the references. The Postman collection (`postman/collections/Trellify.postman_collection.json`) and the k6 load tests (below) remain the manual and performance checks.

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

MongoDB **native driver**, not Mongoose. Soft delete only — set `_destroy: true`, never hard-delete, never expose `_destroy` to the frontend. Every read of a soft-deleted domain filters `_destroy: false`, including inside `$lookup` (`boardModel.getDetailsById` passes `pipeline: [{ $match: { _destroy: false } }]` on the columns and cards joins); the two exceptions are `findAllIds`/`countAll`, which feed the append-only bloom filters and must see tombstones. Prefer aggregation pipelines over N+1 queries.

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

### Read-through cache (Redis)

`src/providers/cache.provider.ts` is the only cache engine - a generic `getOrLoad({ cacheName, key, ttlSeconds, negativeTtlSeconds, load })` plus `invalidate(key)`. It coalesces concurrent misses in two layers: a process-local in-flight `Map`, then a Redis lock (`SET sf:<key> <token> PX 10000 NX`) so only one replica of the 3-6 runs the loader while the others poll the value key and return what the leader stored. A miss that finds no board caches the JSON literal `null` under a shorter TTL, so a flood of requests for an id that does not exist cannot keep reaching Mongo. TTLs carry +-10% jitter so entries created together do not expire together.

Rules that keep it safe:

- **Every failure path reads through.** Any Redis error or timeout logs a warning, increments `cache_requests_total{result="error"}` and runs the loader. `enableOfflineQueue` is on, so a command issued during an outage would hang rather than reject; every Redis call in the cache is therefore wrapped in a `CACHE_COMMAND_TIMEOUT_MS` race, deliberately tighter than the client-wide `REDIS_COMMAND_TIMEOUT_MS` so the cache keeps its own budget. Set both above the p99 command latency _including a reconnect_: too tight and the cache silently fails open on every request while still looking healthy.
- **Authorization is cached separately, on a short leash, and never taken from the board snapshot.** `boardService.getDetails` gates on `canUserAccessBoard` before touching the board entry. That check reads `c:v1:board-membership:<id>` - only `ownerIds`/`memberIds`/`type`, under `BOARD_MEMBERSHIP_CACHE_TTL_SECONDS` (5s) - never the `ownerIds` embedded in the cached board, whose 30s TTL would keep a removed member reading for far too long. Three facts keep the short entry safe: `ownerIds` is written once in `boardModel.createNew` and never mutated, so owner checks cannot go stale; `UPDATE_BOARD_SCHEMA` only picks title/description/type/columnOrderIds, so no request can add itself as a member; and membership changes through exactly two calls, `pushMemberIds` and `pullMemberIds`.
- **Membership invalidation does not go through `broadcastBoardUpdate`.** It is called from the services - `board.service.removeMember`, `board.service.update`, and the ACCEPTED branch of `invitation.service.updateBoardInvitation` - so it lands _before_ the response. The broadcast hook is too late here: `board.controller.removeMember` awaits `evictUserFromBoardRoom` first, and that runs a `fetchSockets()` fan-out with a 5s `requestsTimeout`, which would roughly double the window in which a removed member can still read. `removeMember` itself reads `boardModel.findMembership` directly, uncached - it is deciding whether to change membership and must not act on a stale copy.
- **The broadcast path must never read the cache.** `sendBoardUpdate` calls `boardService.getBoardSnapshot`, which always goes to Mongo. The client replaces its whole board with that payload, so emitting a stale snapshot rolls the board backwards and leaves it there.
- **Invalidation has exactly one site**: `broadcastBoardUpdate` drops `c:v1:board:<id>` before the `getIo()` guard, which covers every board/column/card/invitation mutation. Add a mutation that does not broadcast and it will serve stale reads until the TTL. `PUT /v1/users/update` is the known one - `displayName`/`avatar` are embedded through the `owners`/`members` lookups, so a profile edit shows up a TTL late.
- Cache only the value _after_ `groupCardsIntoColumns`. That helper compares BSON `ObjectId`s (`card.columnId.equals(...)`), which JSON round-tripping destroys; the grouped result only carries ids, so it survives.
- `cachedRaw` lets a caller hand `getOrLoad` a cache entry it has already read, so `decide()` skips its own `GET`. It exists for the bloom-guarded path described below; `undefined` means "not read, fetch it yourself" and `null` means "already read, it was a miss" - collapsing those two into one value reintroduces the round trip it was added to remove.
- Cache keys are `c:v1:<domain>:<id>` and locks `sf:c:v1:<domain>:<id>`. The `v1` segment is a payload-shape version - bump it when the snapshot shape changes so a new deploy cannot read old entries. TTLs are mandatory here, unlike the `bv:` viewer keys where they are forbidden.

Watch `cache_requests_total{cache,result}` and `cache_loader_duration_seconds`. The histogram count is the number of loads that actually reached the database, so a burst of N concurrent requests for a cold key should move it by 1.

### Bloom filter (cache penetration)

Negative caching only stops a repeated bad id. A flood of _distinct_ random ObjectIds defeats it entirely - every request is a fresh key, so every request reaches Mongo and leaves a negative entry behind. `src/providers/bloom.provider.ts` is the generic engine (`isPossiblyPresent`, `addItem`, `buildFilter`); `src/config/bloom.ts` holds the three filter descriptors and `ENSURE_BLOOM_FILTERS`, the way `src/config/indexes.ts` holds `INDEX_PLAN`.

| filter | key             | capacity  | guards                                                           |
| ------ | --------------- | --------- | ---------------------------------------------------------------- |
| board  | `bf:v1:boards`  | 100_000   | `board.service.getMembership`, `removeMember`                    |
| column | `bf:v1:columns` | 200_000   | `column.service.assertColumnAccess`, `moveCardToDifferentColumn` |
| card   | `bf:v1:cards`   | 1_000_000 | `card.service.assertCardAccess`, `moveCardToDifferentColumn`     |

**A probe only helps where it runs before the first Mongo read.** Board reads and `POST /cards|/columns` were covered by the board filter alone because they call `assertBoardAccess` first, but `assertCardAccess`/`assertColumnAccess` must read the card or column to _find_ its `boardId` - by the time the board filter runs, the query has already happened. That is why cards and columns need filters of their own, and why the probe goes above the `findOneById`, never below it. `moveCardToDifferentColumn` checks all three ids before its `Promise.all`; it was the worst endpoint at 3 reads per request.

Every `:id` route param is validated against `OBJECT_ID_RULE` before any of this (`*_ID_PARAMS_SCHEMA` in `packages/shared/src/schemas/`). Do not lean on the filter for that: a malformed id reaching `new ObjectId()` throws a `BSONError` and returns 500, and the filter only masks it while it happens to be loaded.

`BF.*` is a Redis 8 built-in, but **only when the modules are loaded**. The image ships `redisbloom.so` and its `docker-entrypoint.sh` appends a `--loadmodule` flag per module - and `infra/trellify/base/redis/statefulset.yaml` overrides `command:`, which skips that entrypoint entirely. That is why `redis.conf` carries an explicit `loadmodule /usr/local/lib/redis/modules/redisbloom.so`; delete that line and every probe fails open, silently losing the protection while everything still looks healthy. The loadtest composes set no `command:`, so they get the modules from the entrypoint instead.

A false negative here is not a slow read, it is a **permanent 404 on a row that exists**. Four rules keep that impossible:

- **An unusable filter key must read as "might exist," and the guard has to check `TYPE`, not `EXISTS`.** `BF.EXISTS` returns 0 both for an absent key and for a key holding the wrong type - it does not raise on a type mismatch. A plain `EXISTS` guard therefore covers the missing case but lets a wrong-type key through, where that 0 reads as "definitely not present" and 404s every real row. Both scripts compare `redis.call("type", ...)` against `MBbloom--`, that type name being part of the RedisBloom RDB format and so effectively frozen. The probe reports the mismatch as `result="unavailable"` and fails open; any Redis error or timeout does the same under `result="error"`.
- **`BF.ADD` must never create the filter.** On a missing key it would silently build a default-sized filter holding only that one id, and every _other_ id would then read as absent. `ADD_IF_BUILT_SCRIPT` makes adding to a missing filter a no-op.
- **The build is atomic, and it repairs a wrong-type key.** `buildFilter` reserves `<key>:building`, fills it, then `RENAME`s over the live key, so no reader ever sees a partially filled filter. One replica wins the `sf:<key>` lock; the rest fail open until the rename lands. Its early exit compares `TYPE` too, so anything that is not a bloom filter falls through to a rebuild and gets overwritten rather than leaving the probe failing open forever.
- **Never put a TTL on a `bf:` key** - same rule as the `bv:` viewer keys, and for the same reason: an expired key reads back as "absent", which here means a 404 rather than a skipped broadcast.

**The board probe and the membership cache read are one Redis call, not two.** `getMembership` used to probe and then let `getOrLoad` do its own `GET`, which cost two round trips on _every_ board access - and since legitimate traffic only ever holds ids that exist, all of those probes returned `present` and the extra trip bought nothing. Measured on `board-read baseline` (median of 3), the split version cost p95 +12.7% and 7.4% throughput against `BLOOM_FILTER_ENABLED=false`; `MIGHT_EXIST_AND_READ_SCRIPT` runs `BF.EXISTS` and the `GET` in one `EVAL` and hands the raw entry to `getOrLoad` as `cachedRaw`, which puts it back within noise of the filter being off. Keep any future guard-plus-cache pair merged the same way rather than stacking round trips.

That script is the one place here that **touches two keys in a single `EVAL`** (`bf:v1:boards` and `c:v1:board-membership:<id>`), which is only safe because Redis runs as a single instance. Under Redis Cluster those keys hash to different slots, the `EVAL` fails `CROSSSLOT`, and the fail-open `catch` turns that into a **silent** loss of protection - every probe lands on `bloom_filter_checks_total{result="error"}` while the app keeps serving normally. Sharding Redis means splitting the script back into two calls, or hash-tagging the keys into one slot.

The other probe sites are deliberately left as standalone calls: `assertCardAccess`, `assertColumnAccess` and the three ids `moveCardToDifferentColumn` checks all go straight to Mongo afterwards, so there is no cache read to merge with.

`ENSURE_BLOOM_FILTERS` runs **after `server.listen`, unawaited**, so startup time never scales with collection size; until it finishes the probes fail open. `addItem` runs inside `createNew` for all three domains and is awaited before the response, otherwise a client could read its own new row back as a 404.

Ids written **outside** those `createNew` paths - a Mongo restore, a migration, the loadtest seed script - are invisible to the filter and would 404 forever. `buildFilter` therefore compares `BF.CARD` against `countAll()` and rebuilds when the filter holds fewer ids than the collection; `REGISTER_BLOOM_RECOVERY` re-runs it on every Redis reconnect. That comparison is only sound because **every domain here is soft-deleted and `findAllIds`/`countAll` deliberately do not filter `_destroy`** - the filter is append-only, so it must hold every id ever created, and the two numbers stay equal for the life of the collection. Filtering `_destroy` in either helper would make `held` drift above `expected` and blind the check permanently. Restoring a database or bulk-importing still needs a manual **`DEL bf:v1:boards bf:v1:columns bf:v1:cards`** - an absent filter fails open and the next start rebuilds it.

`BLOOM_FILTER_ENABLED=false` is the kill switch and restores exactly the previous behaviour. Watch `bloom_filter_checks_total{filter,result}` - `absent` is work avoided, a rising `error` means Redis is unhealthy and every probe is reading through - and `bloom_filter_items`, which is 0 whenever no filter is loaded.

### The shared Redis client

`getRedisClient()` (`src/providers/redis.provider.ts`) is one lazily built ioredis singleton shared by the rate limiter, the viewer registry and the cache. BullMQ does not use it - `queues/redis.client.ts` hands BullMQ a plain options object and it builds its own connections - and the worker process never instantiates it at all.

- **Never add an option to that client without overriding it in `setupSocketAdapter`.** `duplicate()` copies the parent options wholesale, so the Socket.io adapter's pub/sub pair inherits whatever you set. The adapter issues `SUBSCRIBE`/`PSUBSCRIBE` fire-and-forget, and ioredis re-issues them on every reconnect with no error handling - so a `commandTimeout` firing during a network flap leaves the sub client permanently unsubscribed and cross-node broadcasts dead, with nothing logged anywhere. `ADAPTER_CLIENT_OPTIONS` in `src/sockets/socket.server.ts` opts the pair out; extend it whenever you extend the client.
- Register event listeners **inside** the `if (!redisClient)` guard. `getRedisClient()` is called from hot paths, and re-attaching on every call blows past Node's `maxListeners`.
- `quit()` rejects when the connection is already gone. Both `closeRedisClient` and `closeSocketAdapter` catch that and fall back to `disconnect()` - without it the exit hook never reaches `CLOSE_DB()` and the pod hangs until SIGKILL.
- `checkRateLimit` (`src/utils/rate-limiter.ts`) is **fail-open**: a Redis outage logs a warning and lets the request through rather than blocking every password reset. It runs INCR and EXPIRE in one Lua call, because a crash between two separate commands would leave a counter with no TTL and lock that caller out for good. The 429 is thrown outside the try block so the catch cannot swallow it. Every outcome lands on `rate_limit_decisions_total{bucket,result}`, so a wave of 429s and a silent fail-open during a Redis outage are both visible - watch `result="unavailable"`, which means the limit is not being enforced at all.
- `rateLimitMiddleware` (`src/middlewares/rate-limit.middleware.ts`) keys on `actorId(request)`, so it **must be mounted after `authMiddleware.isAuthorized`**. Every write route shares the `write` bucket (`WRITE_RATE_LIMIT_PER_MINUTE`, 300) which is sized for continuous drag-and-drop - each drop is one `PUT /boards/supports/moving_card`; `POST /invitations/board` additionally carries a tighter `invite` bucket (`INVITE_RATE_LIMIT_PER_MINUTE`, 20) because it writes rows into somebody else's invitation list. The load-test stack raises `WRITE_RATE_LIMIT_PER_MINUTE` to an effectively unlimited value in `k6/loadtest.env`: the limiter keys on the user id and the stack seeds only 50 users, so the production ceiling turns every write profile into a wall of 429s. Raise it there, never switch the middleware off, or the capacity numbers stop including its Redis `INCR`.

### Background jobs (BullMQ + Redis)

`src/worker.ts` is a **separate process** from the API server. Queues live in `src/queues/<domain>/` with a consistent four-file shape: `*.queue.ts` (producer), `*.worker.ts` (consumer), `*.processor.ts` (job logic), `*.interface.ts` (payload types). Queue names go in `src/queues/queue.constants.ts` and are namespaced by `QUEUE_PREFIX`. Redis is also used directly for rate limiting (`src/utils/rate-limiter.ts`).

Both entrypoints register `async-exit-hook` shutdown sequences (metrics server/queue/adapter/Redis/Mongo) — extend those when adding a long-lived resource.

### Observability

Both the API server and the worker expose a Prometheus endpoint on a **second HTTP server** at `METRICS_PORT` (9464), separate from the app port — `startMetricsServer()` in `src/providers/metrics.provider.ts`. In production each runs in its own pod, so both keep 9464; locally `pnpm start:dev` runs them on one host, so `start:worker:dev` sets `METRICS_PORT=9465` for the worker (the same trick `k6/docker-compose.multi.yml` uses). A metrics server that cannot bind logs an error and the process keeps serving - the worker's `/healthz` server is deliberately left fatal, because the k8s probes depend on it. All custom metrics are declared in that one file against a single `Registry`; add new ones there and export them rather than creating a registry elsewhere. `src/middlewares/metrics.middleware.ts` records latency for every request, including ones that never match a route.

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

## Testing

Vitest everywhere except E2E. Specs are `*.spec.ts(x)`; both `tsconfig.build.json` files exclude `**/*spec.ts` and `vitest.config.ts`, so nothing test-related reaches `dist/`.

- **Unit tests sit next to the file they cover** inside `src/` (`board.broadcast.ts` ↔ `board.broadcast.spec.ts`). Do not mirror `src/` into a separate tree.
- **Server integration tests live in `apps/server/test/integration/`**, grouped by feature or endpoint (`api/`, `providers/`, `utils/`), and import helpers through the `test/*` alias. `setup/global-setup.ts` starts the containers once and hands their URLs to workers through `project.provide`; `setup/environment.ts` writes them into `process.env` **before** anything imports `src/config/environment`; `setup/lifecycle.ts` mocks Brevo, Cloudinary and Turnstile, empties every collection plus `FLUSHALL` before each test, and closes the BullMQ queue, Redis and Mongo after each file. Files run serially (`fileParallelism: false`) because they share one Mongo and one Redis.
- **Use real Redis, never a mock, for the cache/bloom/rate-limit paths.** They depend on Lua `EVAL`, `TYPE` and `BF.*`, which no in-memory fake implements faithfully. `global-setup.ts` fails fast if the image comes up without RedisBloom.
- **`NODE_ENV=test` makes `src/config/environment.ts` skip `.env` entirely.** `dotenv` never overwrites a variable that is already set, so loading `.env` under test would fill every variable the test did not set with real values (Atlas URI, Brevo key, Cloudinary). Each Vitest config and `e2e/e2e.env` supplies the full variable set itself.
- `src/app.ts` exports `createApp()`, the Express app with no `listen`, sockets or metrics server; supertest drives it directly. `src/index.ts` wraps it for production.
- **Client**: `src/test/setup.ts` registers jest-dom and an MSW server that fails on any unhandled request; `src/test/render.tsx` renders with the real slice reducers, the app theme and a `MemoryRouter`. Mock network at the MSW layer, not by stubbing axios, so the interceptors in `http.ts` stay under test.
- **E2E (`e2e/`)** is its own workspace. Playwright starts `webServer` before `globalSetup`, so it cannot use Testcontainers and uses `e2e/docker-compose.yml` instead. It runs on ports 3100/5174/9474 so it can never reuse a running dev server. The `setup` project seeds an active user straight into Mongo, logs in through the real form with Cloudflare's always-pass Turnstile test keys (which needs network access to Cloudflare), and saves `storageState` for the other projects. E2E files are `*.e2e.ts`, not `*.spec.ts`, which keeps them out of the Vitest lint rules.
- knip: production files are the `!`-suffixed `project` globs in `knip.json`; test-only folders (`apps/server/test`, `apps/client/src/test`, `e2e`) are deliberately left unsuffixed so `knip --production` ignores them.

## Deployment

Production is a single-node k3s cluster; every manifest lives in `infra/` and **ArgoCD reconciles the cluster to `main`**. Nothing is applied by hand — changing production means committing to `infra/`, and a `kubectl` change is reverted by `selfHeal` within seconds. Rollback is `git revert` of the bump commit.

Pushing to `main` triggers `.github/workflows/build-k8s-images.yml`: it builds both images to `ghcr.io/baoduong254/trellify-{server,client}:sha-<short>`, then a second job runs `kustomize edit set image` in `infra/trellify/overlays/prod` and pushes a `chore(deploy): ... [skip ci]` commit. The `[skip ci]` marker is what stops that commit from triggering another build — don't remove it. `latest` is published but never deployed; the overlay always pins the immutable sha tag.

`infra/README.md` is the reference for the cluster: platform vs. application ArgoCD projects, SealedSecrets (and the master key that must be backed up outside the repo), the three Ingresses, the NetworkPolicy, and the MongoDB → R2 backup CronJob. Read it before touching anything under `infra/`.

`docker-compose.yml` and `docker-compose.portainer.yml` at the root are the legacy single-VPS Compose deployment — not the production path. The other compose stacks live next to what they serve: `k6/docker-compose.yml` and `k6/docker-compose.multi.yml` for load tests, `e2e/docker-compose.yml` for Playwright. Compose resolves `build.context`, `env_file` and volume paths relative to the compose file's own directory, so the k6 stacks use `context: ..` to build from the repo root.

## Critical Rules

**Imports** — absolute imports via the `src/*` alias; `@workspace/*` for internal packages; no deep relative paths (`../../../`).

**Type safety** — no `any` (use `unknown`); explicit return types everywhere; no `as` assertions unless unavoidable.

**Validation** — every Zod schema lives in `packages/shared/src/schemas/`; validate at both the route level (middleware) and the model level (before DB writes). Route middleware is built with `validateRequest({ params, body })` (`src/utils/validate-request.ts`), never hand-rolled `try/parseAsync/catch` blocks — it checks params before body, maps any failure to 422, and **replaces `request.body` with the parsed value**, so a field outside the schema never reaches a controller. That write-back is the only thing standing between a request and `$set`: the models' `INVALID_UPDATE_FIELDS` denylists are narrow, and before the write-back existed any board member could `$set` `ownerIds`/`memberIds`/`_destroy`, and any user could `$set` their own `role`. Two rules follow. First, an `UPDATE_*_SCHEMA` is an explicit allowlist of what the client may change — never `COLLECTION_SCHEMA.partial()`. Second, it must not carry defaults: Zod 4 still applies `.default()` inside `.partial()`, so a title-only update would reset `columnOrderIds`/`cardOrderIds`/`comments` to `[]`. Reuse a collection field with `.shape.<field>.unwrap()`. Models take the separate `*PatchType` (`Partial<collection>`) for server-side writes. `test/integration/api/mass-assignment.spec.ts` pins both rules. A route that takes an id in `request.params` validates it too, not just the body — an unvalidated id reaches `new ObjectId()` and turns a 404 into a 500.

**Dead code** — knip runs on pre-commit and in CI. An exported symbol nobody imports, or a dependency nobody uses, will fail the build; delete it or wire it up rather than leaving it dangling.

**Security** — never expose password, tokens, or secrets in responses or logs; never bypass permission checks; always use env variables for secrets.

## Environment Variables

Copy the `.env.example` in both `apps/server/` and `apps/client/` to `.env`. Both apps validate env with Zod at startup (`apps/server/src/config/environment.ts`, `apps/client/src/config/env.ts`) and **throw on the first invalid or missing variable** — add any new variable to the schema and to `.env.example` together.

Server: `PORT`, `NODE_ENV`, `CLIENT_URL`, `MONGODB_URI`, `DATABASE_NAME`, `REDIS_URL`, `QUEUE_PREFIX`, `WORKER_CONCURRENCY`, `WORKER_HEALTH_PORT`, `METRICS_PORT`, `ACCESS_TOKEN_*` / `REFRESH_TOKEN_*` / `COOKIE_MAX_AGE`, `BREVO_API_KEY`, `ADMIN_EMAIL_*`, `CLOUDINARY_*`, `TURNSTILE_SECRET_KEY`, `CACHE_ENABLED`, `CACHE_COMMAND_TIMEOUT_MS`, `REDIS_COMMAND_TIMEOUT_MS`, `BOARD_CACHE_TTL_SECONDS`, `BOARD_CACHE_NEGATIVE_TTL_SECONDS`, `BOARD_MEMBERSHIP_CACHE_TTL_SECONDS`.

Client: `VITE_API_ENDPOINT` (server origin in dev, e.g. `http://localhost:3000`; empty in production), `VITE_TURNSTILE_SITE_KEY` (dev test key: `1x00000000000000000000AA`).

In production these come from `infra/trellify/base/config-server.env` (non-sensitive) and SealedSecrets (everything else) — a new server variable needs adding in both places. That file is turned into a hash-suffixed ConfigMap by `configMapGenerator`; never convert it back to a plain ConfigMap manifest, or a config-only change stops rolling pods and silently never takes effect.

## Git Conventions

Conventional Commits (`feat(scope): description`), enforced by commitlint on `commit-msg`. Hooks are managed by **lefthook** (`lefthook.yaml`) — pre-commit runs lockfile check, CSP hash check, knip, prettier, and `lint:fix`. Branch naming: `feature/*`, `bugfix/*`, `hotfix/*` off `main`. Releases are automated by release-please.

## Further Reading

- `README.md` — setup, feature list, Postman usage, git workflow
- `infra/README.md` — cluster architecture, ArgoCD, secrets, backups, common kubectl operations
- `k6/README.md` — load-test scenarios, profiles, thresholds, Prometheus integration

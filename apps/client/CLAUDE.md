# apps/client

React 19 + Vite + SWC frontend, served from Cloudflare Workers in production.

## Architecture

**Page → Container Component → Presentational Component → UI Primitive**

- **Pages** (`src/pages/`) — route components; connect to Redux, orchestrate data fetching
- **Components** (`src/components/`) — reusable UI built on MUI 7; style via the `sx` prop
- **Redux** (`src/redux/`) — Redux Toolkit slices: `activeBoard`, `user`, `activeCard`, `notifications`; only `user` is persisted to localStorage via redux-persist
- **APIs** (`src/apis/index.ts`) — Axios functions over the shared client in `src/utils/http.ts`
- **Real-time** — Socket.io client in `src/socketClient.ts`; board subscription lives in `src/hooks/useBoardSocket.ts`

Auth token refresh convention: the API returns **410 Gone** (not 401) for an expired access token. `http.ts` intercepts 410, refreshes once through a shared `refreshTokenPromise`, and replays the original request; a 401 means logout. Keep those two status codes distinct.

The client echoes its socket id on every Axios request in the `x-socket-id` header (`SOCKET_ID_HEADER`) so the server's broadcast can skip the originating tab. Preserve that header plumbing when touching the HTTP client.

The board filter (`cardFilter` in `activeBoardSlice`, `src/utils/cardFilter.ts`) only **hides** cards at render time with `display: none` and disables dragging while it is active. Never filter `column.cards` itself: `moveCardInTheSameColumn` and `moveCardBetweenDifferentColumns` send `cardOrderIds` built from that array, so a filtered list would drop the hidden cards from the saved order.

Drag-and-drop uses `@dnd-kit`; Markdown editing uses `@uiw/react-md-editor`; bot protection uses Cloudflare Turnstile (client widget + `src/middlewares/turnstile.middleware.ts` on the server).

`VITE_API_ENDPOINT` is `https://trellify-api.duonggiabao.com` in production builds, set by the `deploy-client` job; nothing else in the bundle may hardcode a backend URL. The client (`trellify.`) and API (`trellify-api.`) are cross-origin but **same-site**, which is why `SameSite=lax` cookies still flow; a client on `*.workers.dev` would be cross-site and could not log in. Keep the API a first-level subdomain, because Universal SSL does not cover `api.trellify.duonggiabao.com`. Every API request needs a preflight (`x-socket-id`), and `OPTIONS` counts towards the Ingress's 20 rps per IP, so `corsOptions.maxAge` must stay.

The UI must keep working with no cluster running. `http.ts` turns a missing response or a 502/503/504/530 into one deduplicated toast and never logs out on it, including when the token refresh is what failed; pages that load data show a Retry instead of a skeleton that never ends.

## Error monitoring (Sentry)

`Sentry.init` in `src/main.tsx` is enabled only in production builds, so dev and E2E never send events. The DSN lives in `@workspace/shared/constants/sentry` because both apps need it. The browser never talks to `sentry.io`: `tunnel` posts every envelope to `POST /diagnostics` on the client's own origin, which the Cloudflare Worker in `worker/index.ts` handles (`run_worker_first: ["/diagnostics"]` in `wrangler.jsonc`; every other path is served straight from static assets and never runs the script). It forwards the raw bytes upstream and relays `X-Sentry-Rate-Limits`/`Retry-After` so the SDK still backs off. The tunnel lives on the Worker, not the API, so Sentry keeps receiving events while the cluster is off. `dataCollection.userInfo` makes Sentry infer the user's IP from whoever connects to it, which behind the tunnel is the Worker, so the forward sets `X-Forwarded-For` from `CF-Connecting-IP`. Drop that header and every event reports a Cloudflare egress IP. The Worker module may export only its `default` handler and types: workerd treats every other named export as an entrypoint and refuses a plain value at startup, which unit tests and `tsc` do not catch. The legacy `POST /api/v1/diagnostics` route on the server (`apps/server/src/providers/sentry.provider.ts`) still exists for bundles cached before the switch. The tunnel exists because ad blockers and antivirus web filters (Kaspersky's is one) block `*.sentry.io` outright, which loses those users' errors silently. The tunnel refuses any envelope whose header DSN is not this project's, so it cannot be used as an open relay to other Sentry projects. Keep the forward byte-exact — replay segments are compressed binary, so decoding the body as text corrupts them. Don't add Sentry's ingest host back to the CSP `connect-src`; nothing needs it. `skipBrowserExtensionCheck` is on because an extension that injects `chrome.runtime.id` into the page otherwise makes the SDK disable itself.

Source maps are uploaded by `@sentry/vite-plugin` only when `SENTRY_AUTH_TOKEN` is set. The `deploy-client` job in `build-k8s-images.yml` passes it as an environment variable plus `SENTRY_RELEASE` set to the deploy's `sha-<short>` tag. The build then emits `hidden` maps, uploads them and deletes them from `dist`, so a `.map` is never uploaded to Cloudflare. Without the token (`ci.yml`, local builds) the plugin is disabled and no maps are generated at all.

## CSP and inline scripts

`public/_headers` holds the security headers and pins a `script-src` allowlist of sha256 hashes for the inline `<script>` blocks in `index.html`. Static hosting has no per-request nonce. Rules that match the same path have their values joined with a comma, so `Cache-Control` must never go in the `/*` rule. Editing any inline script without updating those hashes ships a CSP that blocks the script and breaks the page — `scripts/check-csp-hashes.sh` (pre-commit and CI) fails with the exact hashes to paste in.

## Testing

The client's `typecheck` is `tsc -b`, not `tsc --noEmit`: its root `tsconfig.json` is solution-style (`"files": []` plus references to `tsconfig.app.json`/`tsconfig.node.json`), and plain `tsc --noEmit` only reads that root, checks zero files and exits 0. Only build mode follows the references.

`src/test/setup.ts` registers jest-dom and an MSW server that fails on any unhandled request; `src/test/render.tsx` renders with the real slice reducers, the app theme and a `MemoryRouter`. Mock network at the MSW layer, not by stubbing axios, so the interceptors in `http.ts` stay under test.

## Environment variables

`VITE_API_ENDPOINT` (server origin, e.g. `http://localhost:3000` in dev, `https://trellify-api.duonggiabao.com` in production), `VITE_TURNSTILE_SITE_KEY` (dev test key: `1x00000000000000000000AA`). Validated by `src/config/env.ts`.

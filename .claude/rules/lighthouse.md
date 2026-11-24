---
paths:
  - "unlighthouse.config.ts"
  - ".env.unlighthouse*"
---

# Lighthouse (Unlighthouse)

Audits the **deployed** site (`UNLIGHTHOUSE_SITE`, default `https://trellify.duonggiabao.com`), never a local build. Config is `unlighthouse.config.ts` at the root, which is registered as a knip entry.

```bash
pnpm lighthouse         # public pages, interactive UI
pnpm lighthouse:auth    # authenticated pages, loads .env.unlighthouse (gitignored)
pnpm lighthouse:ci      # public pages, headless, fails on ci.budget
pnpm lighthouse:ci:auth # authenticated pages, headless
```

**There is deliberately no GitHub Actions workflow for it.** Cloudflare Bot Fight Mode (Free plan) answers GitHub-hosted runners with a Managed Challenge, WAF custom rules cannot skip Bot Fight Mode, and a self-hosted runner on a public repo would let fork PRs run code inside the home network. Don't add a workflow back without solving that first.

The config works around three behaviours of Unlighthouse 0.18. Removing any of these workarounds breaks the scans without an error:

- **Throttling is set explicitly.** `resolveUserConfig` checks `if (typeof config.scanner?.throttle)`, which is always truthy, so without `lighthouseOptions.throttling` every scan uses slow 4G, even with `device: "desktop"` (performance ~0.55 instead of ~0.95).
- **Auth is injected by the `authenticate` hook into `defaultBrowserContext()`.** Lighthouse runs in a child process on a tab in the browser's default context, while puppeteer-cluster gives every job its own throwaway incognito context. The `cookies`/`localStorage` options therefore never reach the page being measured, and every protected route renders `/login`. `disableStorageReset` is on for the authenticated run so Lighthouse does not wipe `persist:root` before loading the page. The hook first trades `UNLIGHTHOUSE_REFRESH_TOKEN` for a fresh access token via `GET /api/v1/users/refresh_token` (refresh tokens are not rotated, so it works for its whole 14 days) and throws if that fails, so only the refresh token and `persist:root` live in `.env.unlighthouse`.
- **`maxConcurrency: 1`.** Parallel runs hit `NO_NAVSTART` and silently drop routes from the report.

`unlighthouse-ci` passes a route that has no report or a null/0 score (`if (!categories) return;`, `if (category.score && ...)`), so a Cloudflare challenge page or a protected route redirected to `/login` used to count as a pass. The `worker-finished` hook reads each route's `lighthouse.json` and fails on a missing report, a `runtimeError`, a final path that differs from the requested one, or a missing score; it sets `process.exitCode` inside an `exit` listener because the CLI calls `process.exit(0)` itself afterwards. The authenticated run has `disableStorageReset` on, which also keeps the HTTP cache between pages, so its performance numbers lean towards a warm cache.

Public and authenticated routes are separate runs, split on whether the auth variables are present, because `AuthLayout` redirects a logged-in user away from `/login`/`/register`. Best practices is capped around 0.81 by Cloudflare's injected `/cdn-cgi/challenge-platform` script, and SEO is 0.63 on `noindex` pages. The budgets account for both; a drop below that is a real regression, such as a CSP violation in the console.

# e2e (Playwright)

```bash
pnpm e2e:up      # Mongo + Redis (docker-compose.yml, ports 27019/6381)
pnpm test:e2e    # starts its own API (3100) and Vite (5174) from e2e.env
pnpm e2e:down
```

This is its own workspace. Playwright starts `webServer` before `globalSetup`, so it cannot use Testcontainers and uses `docker-compose.yml` instead. It runs on ports 3100/5174/9474 so it can never reuse a running dev server. The `setup` project seeds an active user straight into Mongo, logs in through the real form with Cloudflare's always-pass Turnstile test keys (which needs network access to Cloudflare), and saves `storageState` for the other projects. E2E files are `*.e2e.ts`, not `*.spec.ts`, which keeps them out of the Vitest lint rules.

The compose Mongo sets `GLIBC_TUNABLES=glibc.pthread.rseq=1` for CI's kernel 7.0 (see `.github/CLAUDE.md`); dropping it fails the job on CI only. `e2e.env` supplies the server's full variable set itself, because `NODE_ENV=test` skips `.env`.

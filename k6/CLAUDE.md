# k6 load testing

Runs against the kind dev cluster (see `infra/CLAUDE.md`) in loadtest mode — the production server image on `infra/apps/trellify/overlays/loadtest` (the dev overlay plus `NODE_ENV=production`, the raised write rate limit and prod's resource limits), so requests go through ingress-nginx like prod. It shares the dev database `trellify` on kind (the seed only touches `k6-` documents) and never touches real data. Requires the dev cluster tooling and `k6` on PATH. This folder is excluded from knip.

```bash
tilt up -- --loadtest # production image; add --server-replicas=3 for multi-pod
pnpm loadtest:seed    # seed users/boards/cards, mint JWTs into k6/data/users.json
pnpm k6 smoke         # gate — 1 VU through every flow; if this fails, later numbers are meaningless
pnpm k6 mixed load    # main run; `pnpm k6` with no args prompts for scenario and profile
tilt down             # PVCs survive; deleting the kind cluster needs a re-seed
```

`pnpm k6 <scenario> <profile>` is the single entrypoint for every run — scenarios are `smoke`, `mixed`, `board-read`, `board-write`, `auth`, `socket-fanout`; profiles are `smoke`, `baseline`, `load`, `stress`, `spike`, `soak`, `capacity`. `--prom` pushes to Prometheus, `--ts` writes a time-series file for `pnpm k6:peak-rps`, `--watch` samples pod CPU (kubelet stats) and each server pod's `/metrics` through `kubectl`, and any other flag is forwarded to `k6 run`.

Every request carries a `CF-Connecting-IP` that changes per VU and iteration (`lib/api.js`), because the `/api` Ingress limits each client IP to 20 rps. The limit answers 429 through `limit-req-status-code` in the controller config (`infra/platform/ingress-nginx/values.yaml`); an Ingress annotation of that name is ignored.

The loadtest overlay raises `WRITE_RATE_LIMIT_PER_MINUTE` and `LOGIN_RATE_LIMIT_PER_MINUTE` because the stack seeds only 50 users; raise limits there, never switch the rate-limit middleware off, or the capacity numbers stop including its Redis `INCR`.

`--aws` runs k6 in a pod `loadtest/k6` on a tainted `loadgen` node of the EKS cluster (the node group only exists when `loadgen_node_count > 0`), resolving `trellify-api.duonggiabao.com` to the in-cluster ingress-nginx through `hostAliases`. It only accepts a kubectl context whose cluster is `trellify-dr`, skips the auth flow (real Turnstile secret) and keeps prod's rate limits. A cluster seeded for k6 must have its R2 backup CronJob suspended, or a k6 archive becomes the newest one on R2 and the next real failover restores it.

The seed script writes ids outside the `createNew` paths, so they are invisible to the server's bloom filters until `buildFilter` rebuilds them (see `apps/server/CLAUDE.md`).

`README.md` here documents the profiles, thresholds, and the Prometheus remote-write path.

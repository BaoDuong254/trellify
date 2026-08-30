# k6 performance testing

Load tests for the Trellify REST API, run against an isolated docker-compose stack built from the production Dockerfile with its own MongoDB and Redis. Nothing here touches real data.

## Prerequisites

- Docker Desktop running
- k6 on your PATH:

```powershell
winget install GrafanaLabs.k6   # or: choco install k6
k6 version
```

If `k6 version` fails right after installing, open a new terminal — an existing one will not pick up the updated PATH.

## Quick start

```powershell
pnpm loadtest:up      # build the production image, start server/worker/mongo/redis
pnpm loadtest:seed    # create users/boards/cards, mint JWTs into k6/data/users.json
pnpm k6:smoke         # gate: 1 VU through every flow, all checks must pass
pnpm k6:load          # the main run
pnpm loadtest:down    # remove containers and volumes
```

`pnpm k6:smoke` is a gate. If it fails, stop — the payloads or the auth setup are wrong, and every later number is meaningless.

`loadtest:down` removes the volumes too, so re-seed after it. Otherwise `users.json` points at documents that no longer exist and every request returns 403 or 404.

## Scripts

| Script                                  | What it does                                          | Typical duration    |
| --------------------------------------- | ----------------------------------------------------- | ------------------- |
| `loadtest:up`                           | Build and start the single-replica stack              | 2-10 min first time |
| `loadtest:up:multi`                     | Same, but 3 server replicas behind nginx              | 2-10 min first time |
| `loadtest:down` / `loadtest:down:multi` | Stop and delete containers plus volumes               | seconds             |
| `loadtest:seed`                         | Seed users, boards, cards; write `k6/data/users.json` | ~90s at defaults    |
| `loadtest:clean`                        | Delete every `k6-` prefixed document, no re-seed      | seconds             |
| `k6:smoke`                              | 1 VU through all flows once                           | ~10s                |
| `k6:baseline`                           | Low concurrency, intrinsic per-endpoint cost          | ~90s                |
| `k6:load`                               | Main scenario, 50 VUs                                 | ~5 min              |
| `k6:stress`                             | Ramp to 200 VUs                                       | ~12 min             |
| `k6:spike`                              | Sudden jump to 200 VUs                                | ~3 min              |
| `k6:soak`                               | 20 VUs held for 30 minutes                            | 30 min              |
| `k6:capacity`                           | Open model, finds the breaking point and aborts       | up to 15 min        |
| `k6:socket`                             | Socket.io fan-out cost                                | ~2 min              |
| `k6:prom`                               | `k6:load` with results pushed to Prometheus           | ~5 min              |
| `k6:traffic-mix`                        | Derive the real traffic mix from Prometheus           | seconds             |

## Scenarios

| File                         | Covers                                                       |
| ---------------------------- | ------------------------------------------------------------ |
| `scenarios/smoke.js`         | All three flows once, sequentially                           |
| `scenarios/mixed.js`         | Main scenario: read 70% / write 25% / auth 5% in parallel    |
| `scenarios/board-read.js`    | `GET /boards` and `GET /boards/:id`                          |
| `scenarios/board-write.js`   | Create columns and cards, update, comment, move, delete      |
| `scenarios/auth.js`          | `login`, `refresh_token`, `logout`                           |
| `scenarios/socket-fanout.js` | Holds Socket.io viewers while writers mutate the same boards |

The write flow creates and deletes its own columns and cards each iteration, so many VUs can share a board without corrupting card order, and the database does not grow without bound.

## Profiles

Select with `-e PROFILE=<name>`, or use the matching `pnpm k6:*` script.

| Profile    | Executor               | Shape                                      |
| ---------- | ---------------------- | ------------------------------------------ |
| `smoke`    | `constant-vus`         | 1 VU, 30s                                  |
| `baseline` | `constant-vus`         | 3 VUs, 90s, think time forced to 0         |
| `load`     | `ramping-vus`          | 0 to 50 VUs over 5 min                     |
| `stress`   | `ramping-vus`          | Steps to 200 VUs                           |
| `spike`    | `ramping-vus`          | 10 to 200 VUs in 20s                       |
| `soak`     | `constant-vus`         | 20 VUs, 30 min                             |
| `capacity` | `ramping-arrival-rate` | 50 to 400 iterations/s, aborts at the knee |

For `capacity`, `rate` is iterations per second, not requests. Read the real request rate from `http_reqs` in the summary.

## Environment variables

| Variable               | Default                 | Purpose                                                                                               |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `BASE_URL`             | `http://localhost:3000` | API root                                                                                              |
| `PROFILE`              | `load`                  | Profile name from the table above                                                                     |
| `VUS`                  | per profile             | Override peak VUs for closed-model profiles                                                           |
| `RATE`                 | per profile             | Override peak iterations/s for `capacity`                                                             |
| `DURATION`             | per profile             | Applies to `constant-vus` profiles only                                                               |
| `THINK_TIME`           | `1`                     | Seconds between steps; forced to 0 for `capacity` and `baseline`                                      |
| `TEST_ID`              | `local-<timestamp>`     | Tags every metric, useful for comparing runs in Grafana                                               |
| `USERS_PATH`           | `../data/users.json`    | Seeded user file                                                                                      |
| `SUMMARY_DIR`          | `k6/results`            | Where the summary is written                                                                          |
| `VERBOSE`              | unset                   | Print response bodies for failed checks                                                               |
| `TURNSTILE_TOKEN`      | `loadtest`              | Dummy token sent to the login endpoint; the stack runs the Cloudflare test secret so any value passes |
| `LOADTEST_PORT`        | `3000`                  | Host port the stack publishes                                                                         |
| `SOCKET_VIEWERS`       | `25`                    | Socket.io connections held open by `k6:socket`                                                        |
| `SOCKET_BOARDS`        | `5`                     | Boards viewers and writers converge on                                                                |
| `SOCKET_WRITERS`       | `12`                    | Writing VUs during `k6:socket`                                                                        |
| `SOCKET_HOLD`          | `300`                   | Seconds to hold connections                                                                           |
| `SEED_USERS`           | `50`                    | Users to seed                                                                                         |
| `SEED_BOARDS_PER_USER` | `15`                    | Small boards per user; needs to exceed 12 for pagination to engage                                    |
| `SEED_MEDIUM_BOARDS`   | `5`                     | Shared medium boards                                                                                  |
| `SEED_LARGE_BOARDS`    | `5`                     | Shared large boards                                                                                   |

Example:

```powershell
k6 run -e PROFILE=stress -e VUS=80 -e THINK_TIME=0 k6/scenarios/mixed.js
$env:SEED_USERS = "10"; pnpm loadtest:seed
```

## Configuration files

| File                  | Used by                              | Contents                                                                                                                                                  |
| --------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loadtest.env`        | both compose stacks, `loadtest:seed` | Server configuration for the isolated stack. Every value is fake and safe to commit. Sets the Cloudflare test Turnstile key so k6 can send a dummy token. |
| `prometheus.env`      | `k6:prom`                            | Remote write endpoint and trend stats                                                                                                                     |
| `nginx/loadtest.conf` | `loadtest:up:multi`                  | Load balancer in front of the 3 replicas                                                                                                                  |

Seed sizing is not in `loadtest.env` on purpose — it comes from `SEED_*` environment variables so CI can seed a small dataset without editing the file.

## Output

Each run writes `k6/results/<profile>.json` and `<profile>.html`. Both are gitignored. Open the HTML file in a browser.

## One replica or three

```powershell
pnpm loadtest:up          # 1 replica, the default configuration
pnpm loadtest:up:multi    # 3 replicas behind nginx, exercises the Redis adapter
```

Both stacks share a compose project name and host ports, so they cannot run at the same time — but switching does not need a `down` first, since the scripts pass `--remove-orphans`. Seed data survives a switch because the MongoDB container is not recreated; only `down -v` clears it.

Use the multi stack only for questions that involve several instances, such as broadcast fan-out through the Redis adapter. Do not compare numbers between the two configurations.

Per-instance metrics are on ports 9464, 9465 and 9466; the worker uses 9467.

## Port 3000 already in use

The stack publishes port 3000 by default. If another process holds it — **VS Code often does** — you get a confusing failure: `curl localhost:3000` returns 200 while k6 reports 404.

When 127.0.0.1:3000 is taken, Docker can only bind `::`. `curl` reaches nginx over IPv6, while k6 resolves `localhost` to IPv4 and hits the other process instead. Find the culprit:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen |
  ForEach-Object { (Get-Process -Id $_.OwningProcess).ProcessName + " " + $_.LocalAddress }
```

Then move the stack to another port:

```powershell
$env:LOADTEST_PORT = "3100"
pnpm loadtest:up
k6 run -e PROFILE=smoke -e BASE_URL=http://localhost:3100 k6/scenarios/smoke.js
```

## Server metrics

The server and worker expose Prometheus metrics on `METRICS_PORT` (default 9464), separate from the API port.

```powershell
curl http://localhost:9464/metrics
```

| Metric                             | Tells you                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `nodejs_eventloop_lag_p99_seconds` | The main diagnostic. Node is single-threaded and `bcryptjs.compareSync` blocks it, so rising lag means blocking, not merely busy CPU |
| `http_request_duration_seconds`    | Latency by route pattern (`/boards/:id`, never a real id)                                                                            |
| `board_broadcast_duration_seconds` | Broadcast cost, invisible to clients because it runs after the response is sent                                                      |
| `board_broadcast_local_recipients` | Viewers on the instance that handled the write — **not** cluster-wide fan-out                                                        |
| `socketio_connected_sockets`       | Confirms viewers actually joined during `k6:socket`                                                                                  |
| `worker_job_duration_seconds`      | Whether BullMQ jobs are backing up                                                                                                   |
| `mongodb_indexes_ready`            | 1 when every expected index exists; 0 means queries are falling back to collection scans                                             |

## Thresholds

```text
http_req_failed                       rate<0.01
checks                                rate>0.99
http_req_duration{group:read}         p(95)<500   p(99)<1000
http_req_duration{group:write}        p(95)<800   p(99)<1500
http_req_duration{group:auth}         p(95)<1500  p(99)<3000
http_req_duration{board_size:small}   p(95)<500
http_req_duration{board_size:medium}  p(95)<800
http_req_duration{board_size:large}   p(95)<1500
```

The `auth` bound is deliberately loose: it covers bcrypt at cost 10 plus a round trip to Cloudflare Turnstile, so it measures Trellify and Cloudflare together.

The `capacity` profile replaces all of these with looser bounds and `abortOnFail`, because its job is to find the breaking point rather than guard an SLO.

Edit `config/thresholds.js` to change them.

## Prometheus and Grafana

`kube-prometheus-stack` in the cluster has `enableRemoteWriteReceiver` turned on, so a local k6 run can push its results there.

```powershell
kubectl port-forward -n observability svc/kps-prometheus 9090:9090
pnpm k6:prom
```

Then query `k6_http_req_duration_seconds{testid="..."}` in Grafana, or import the official "k6 Prometheus" dashboard.

`pnpm k6:traffic-mix` reads the other direction — it queries the route distribution Prometheus has recorded and prints suggested weights for `mixed.js`. It only returns anything useful once the application metrics have been running in production for a few days.

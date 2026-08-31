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
pnpm k6 smoke         # gate: 1 VU through every flow, all checks must pass
pnpm k6 mixed load    # the main run
pnpm loadtest:down    # remove containers and volumes
```

`pnpm k6 smoke` is a gate. If it fails, stop — the payloads or the auth setup are wrong, and every later number is meaningless.

`loadtest:down` removes the volumes too, so re-seed after it. Otherwise `users.json` points at documents that no longer exist and every request returns 403 or 404.

## Scripts

| Script                                  | What it does                                          | Typical duration    |
| --------------------------------------- | ----------------------------------------------------- | ------------------- |
| `loadtest:up`                           | Build and start the single-replica stack              | 2-10 min first time |
| `loadtest:up:multi`                     | Same, but 3 server replicas behind nginx              | 2-10 min first time |
| `loadtest:down` / `loadtest:down:multi` | Stop and delete containers plus volumes               | seconds             |
| `loadtest:seed`                         | Seed users, boards, cards; write `k6/data/users.json` | ~90s at defaults    |
| `loadtest:clean`                        | Delete every `k6-` prefixed document, no re-seed      | seconds             |
| `k6`                                    | Run any scenario against any profile                  | 10s to 30 min       |
| `k6:peak-rps`                           | Peak RPS from a time-series output file               | seconds             |
| `k6:traffic-mix`                        | Derive the real traffic mix from Prometheus           | seconds             |

## Running a test

One command covers every combination. Called bare it asks for each choice; called with arguments it runs straight away, so it stays copy-pasteable into an issue or a CI job.

```powershell
pnpm k6                        # prompts for scenario, profile, and the two flags
pnpm k6 smoke                  # scenario alone; profile defaults to load
pnpm k6 mixed load             # scenario and profile
pnpm k6 board-read stress
pnpm k6 mixed load --prom      # push to Prometheus using k6/prometheus.env
pnpm k6 mixed load --ts        # also write a time-series file, see Peak RPS
pnpm k6 mixed load -e VUS=100  # any other flag goes straight to k6
pnpm k6 --help
```

The scenario and profile must come first; everything from the first `-` onward is forwarded to `k6 run` untouched, so `-e THINK_TIME=0` and `--out csv=...` work as they always did.

The command it builds is printed before it runs, so what actually executed is always visible.

If stdin is not a terminal and no scenario was given, it prints usage and exits 1 rather than waiting for input that will never come — piping into it or running it from CI fails fast instead of hanging.

## Scenarios

| Name            | File                         | Covers                                                       |
| --------------- | ---------------------------- | ------------------------------------------------------------ |
| `smoke`         | `scenarios/smoke.js`         | All three flows once, sequentially                           |
| `mixed`         | `scenarios/mixed.js`         | Main scenario: read 70% / write 25% / auth 5% in parallel    |
| `board-read`    | `scenarios/board-read.js`    | `GET /boards` and `GET /boards/:id`                          |
| `board-write`   | `scenarios/board-write.js`   | Create columns and cards, update, comment, move, delete      |
| `auth`          | `scenarios/auth.js`          | `login`, `refresh_token`, `logout`                           |
| `socket-fanout` | `scenarios/socket-fanout.js` | Holds Socket.io viewers while writers mutate the same boards |

`smoke` and `socket-fanout` declare their own load shape inside the script instead of calling `scenariosFor()`, so a profile does not change how they run — `pnpm k6` does not ask for one, and passing one prints a note saying it was ignored.

`mixed.js` reports each flow separately through `http_req_duration{group:read}` and friends, but those are latencies measured while all three flows compete for the same server. The single-flow scenarios run one flow on its own, which is what shows that flow's own ceiling.

The write flow creates and deletes its own columns and cards each iteration, so many VUs can share a board without corrupting card order, and the database does not grow without bound.

## Profiles

Pass as the second argument to `pnpm k6`, or set `-e PROFILE=<name>` directly.

| Profile    | Executor               | Shape                                      |
| ---------- | ---------------------- | ------------------------------------------ |
| `smoke`    | `constant-vus`         | 1 VU, 30s                                  |
| `baseline` | `constant-vus`         | 3 VUs, 90s, think time forced to 0         |
| `load`     | `ramping-vus`          | 0 to 50 VUs over 5 min                     |
| `stress`   | `ramping-vus`          | Steps to 200 VUs                           |
| `spike`    | `ramping-vus`          | 10 to 200 VUs in 20s                       |
| `soak`     | `constant-vus`         | 20 VUs, 30 min                             |
| `capacity` | `ramping-arrival-rate` | 50 to 400 iterations/s, aborts at the knee |

For `capacity`, `rate` is iterations per second, not requests. The request rate is `http_reqs` in the summary, but that figure is an average over the whole run — see [Peak RPS](#peak-rps).

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
| `RUN_NAME`             | derived by `pnpm k6`    | Base name of the summary files; the runner sets it, override only to name a run yourself              |
| `VERBOSE`              | unset                   | Print response bodies for failed checks                                                               |
| `TURNSTILE_TOKEN`      | `loadtest`              | Dummy token sent to the login endpoint; the stack runs the Cloudflare test secret so any value passes |
| `LOADTEST_PORT`        | `3000`                  | Host port the stack publishes                                                                         |
| `SOCKET_VIEWERS`       | `25`                    | Socket.io connections held open by `socket-fanout`                                                    |
| `SOCKET_BOARDS`        | `5`                     | Boards viewers and writers converge on                                                                |
| `SOCKET_WRITERS`       | `12`                    | Writing VUs during `socket-fanout`                                                                    |
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

| File                  | Used by                              | Contents                                                                                                                                                                                                                                                                                          |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loadtest.env`        | both compose stacks, `loadtest:seed` | Server configuration for the isolated stack. Every value is fake and safe to commit. Sets the Cloudflare test Turnstile key so k6 can send a dummy token.                                                                                                                                         |
| `prometheus.env`      | `pnpm k6 --prom`                     | Remote write endpoint, trend stats, push interval. `K6_PROMETHEUS_RW_TREND_STATS` has to include `avg` and `med`: the Grafana dashboard defaults its `Trend Metrics Query` variable to one of them, and a stat the run never pushed leaves that variable empty, which blanks every latency panel. |
| `nginx/loadtest.conf` | `loadtest:up:multi`                  | Load balancer in front of the 3 replicas                                                                                                                                                                                                                                                          |

Seed sizing is not in `loadtest.env` on purpose — it comes from `SEED_*` environment variables so CI can seed a small dataset without editing the file.

## Output

Each run writes `k6/results/<name>.json` and `<name>.html`. Both are gitignored. Open the HTML file in a browser.

`pnpm k6` derives `<name>` so two runs can never overwrite each other:

| Scenario                     | Name                   | Example             |
| ---------------------------- | ---------------------- | ------------------- |
| Profile changes the run      | `<scenario>-<profile>` | `board-read-stress` |
| Scenario fixes its own shape | `<scenario>`           | `smoke`             |

So `pnpm k6 mixed load` writes `k6/results/mixed-load.*`, not `load.*` — the older per-profile names are gone. Override with `-e RUN_NAME=...` to label a run yourself.

### Peak RPS

**`http_reqs.rate` in the summary is not the peak.** It is `count` divided by the whole run duration, so every ramp-up and ramp-down second is averaged in with the plateau. Two runs from the same codebase show how misleading that is:

| Profile    | Peak VUs | `http_reqs.rate` | Why                                         |
| ---------- | -------- | ---------------- | ------------------------------------------- |
| `baseline` | 4        | 147.5            | 3 VUs, no ramp, think time forced to 0      |
| `load`     | 51       | 103.4            | 50 VUs, but 1 min ramping up and 1 min down |

`baseline` looks faster than `load` at a twelfth of the concurrency. The two numbers are not comparable, and neither is a peak.

The summary has no time dimension at all, so the peak has to come from the time-series output. `--ts` writes one next to the summary:

```powershell
pnpm k6 mixed load --ts
pnpm k6:peak-rps k6/results/mixed-load-ts.json.gz
```

A `.gz` suffix makes k6 gzip the file; `k6:peak-rps` reads both forms and streams them, so a multi-hundred-MB soak run is fine. It buckets `http_reqs` by second, drops the two partial seconds at the edges, and reports:

| Figure              | Meaning                                                              |
| ------------------- | -------------------------------------------------------------------- |
| `peak 1s`           | Highest single second. Scheduling noise, do not quote it             |
| `peak sustained Ns` | Highest N-second sliding average. **This is the number to quote**    |
| `plateau (median)`  | Median of the seconds at or above half the peak, i.e. the hold phase |
| `summary avg`       | The same figure the summary reports, printed for contrast            |

It also breaks the peak down per scenario, and reports `dropped_iterations` when k6 could not start iterations fast enough — in that case the run measures the load generator, not the server.

Pointing it at a summary file by mistake gives an explanation rather than a parse error.

### Grafana is not the source of truth for the peak

The k6 dashboard reads its `Peak RPS` stat from `sum(irate(k6_http_reqs_total[$__rate_interval]))` reduced by `Max`. That sums a two-point rate estimate over every series `http_reqs` carries a tag for, and `Max` then picks whichever step came out noisiest, so the panel reads high. One `mixed load` run whose best single second was 193 rps showed 239 rps there, and the raw samples rule that out: no 15-second window in the run went above 147 rps, and 15s was the push interval at the time.

`k6:peak-rps` buckets the raw samples instead of re-deriving a rate from a counter, so it is the number of record. Read Grafana for the shape of a run; quote `peak sustained 10s` from `peak-rps`.

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
| `socketio_connected_sockets`       | Confirms viewers actually joined during `socket-fanout`                                                                              |
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
pnpm k6 mixed load --prom
```

Then query `k6_http_req_duration_p95{testid="..."}` in Grafana, or import the official "k6 Prometheus" dashboard.

Two things to set after importing it. Point **Test ID** at the run you care about rather than `All`, which merges every run in the window. Then pick a value in the **Trend Metrics Query** dropdown, usually `p95`: it is the `$quantile_stat` variable behind `HTTP Request Duration`, `HTTP Latency Timings`, `HTTP Latency Stats` and `Requests by URL`, and while it is empty all four read `No data`. The dashboard is not in Git, but Grafana runs with persistence, so both choices survive a pod restart.

`HTTP request failures` reading `No data` means nothing failed. It filters on `expected_response="false"`, and Prometheus has no series to show a zero for when no sample ever matched.

`pnpm k6:traffic-mix` reads the other direction — it queries the route distribution Prometheus has recorded and prints suggested weights for `mixed.js`. It only returns anything useful once the application metrics have been running in production for a few days.

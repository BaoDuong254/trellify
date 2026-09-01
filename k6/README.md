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
| `k6:watch`                              | Sample server CPU and event loop during a run         | seconds             |
| `k6:traffic-mix`                        | Derive the real traffic mix from Prometheus           | seconds             |

## Running a test

One command covers every combination. Called bare it asks for each choice; called with arguments it runs straight away, so it stays copy-pasteable into an issue or a CI job.

```powershell
pnpm k6                        # prompts for scenario, profile, and the flags
pnpm k6 smoke                  # scenario alone; profile defaults to load
pnpm k6 mixed load             # scenario and profile
pnpm k6 board-read stress
pnpm k6 mixed load --prom      # push to Prometheus using k6/prometheus.env
pnpm k6 mixed load --ts        # also write a time-series file, see Peak RPS
pnpm k6 mixed capacity --watch # also sample server CPU and event loop, see Capacity
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

| Profile    | Executor               | Shape                                                      |
| ---------- | ---------------------- | ---------------------------------------------------------- |
| `smoke`    | `constant-vus`         | 1 VU, 30s                                                  |
| `baseline` | `constant-vus`         | 3 VUs, 90s, think time forced to 0                         |
| `load`     | `ramping-vus`          | 0 to 50 VUs over 5 min                                     |
| `stress`   | `ramping-vus`          | Steps to 200 VUs                                           |
| `spike`    | `ramping-vus`          | 10 to 200 VUs in 20s                                       |
| `soak`     | `constant-vus`         | 20 VUs, 30 min                                             |
| `capacity` | `ramping-arrival-rate` | 12-rung ladder, 25 to 800 iterations/s, aborts at the knee |

For `capacity`, `rate` is iterations per second, not requests. The request rate is `http_reqs` in the summary, but that figure is an average over the whole run — see [Peak RPS](#peak-rps).

### Capacity: finding the knee

`capacity` is the only profile that answers "how much can this take". It offers load in 12 rungs — 45s of warm-up, then per rung a 20s ramp and a 60s hold — and stops at the first rung that breaks. Nothing breaks, and it runs 17 minutes to the 800 it/s ceiling.

**Only the holds are measured.** Every request is tagged with the rung it was issued in (`step:s0` … `step:s11`), and requests issued during a ramp get `step:ramp` instead, so a rung's numbers never mix in traffic from the climb toward it.

That tag is the whole mechanism. Each rung gets its own thresholds:

| Selector                     | Threshold    | Aborts | Why                                                            |
| ---------------------------- | ------------ | ------ | -------------------------------------------------------------- |
| `http_req_duration{step:sN}` | `p(95)<2000` | yes    | Latency inside that hold only                                  |
| `http_req_failed{step:sN}`   | `rate<0.05`  | yes    | Errors inside that hold only                                   |
| `http_reqs{step:sN}`         | `count>=0`   | no     | Never fails; it exists purely to make k6 surface the submetric |

k6 only puts a tag-scoped submetric into the summary if a threshold was declared on that exact selector, so the third row is what produces the achieved-throughput column. It has to be `count>=0` rather than `count>0`, because every rung the run never reached reports `count: 0` and must still pass.

Each rung's threshold carries its own `delayAbortEval`, set to the moment that rung's hold has collected 30 seconds of samples. `delayAbortEval` counts from the start of the test, so rung 7's threshold is inert until 9m35s and live from then on — that is what turns a run-wide bound into a per-rung one.

The point of all this: **a cumulative threshold on a ladder aborts on the warm-up, not the knee.** The old `capacity` guarded `http_req_duration p(95)<2000` over the whole run, and `k6/results/capacity.json` records what that does — the run died at 64 seconds, still inside the first ramp, having never reached rung 2, with the summary unable to say at what load. Do not reintroduce an untagged `abortOnFail` here.

`dropped_iterations` gets a non-aborting `count<1`. Under an arrival-rate executor a dropped iteration means the VU pool was exhausted because the server slowed down, which is a symptom of the knee rather than a second definition of it — as a FAIL row it tells you the rungs above it measured the load generator, not Trellify.

Read the result from the ladder table the summary prints:

```
  step   offered      achieved         p(95)   failed
  s5      65 it/s     241.2 req/s      30.83ms   0.00%   ok
  s6      88 it/s     321.5 req/s     203.98ms   0.00%   ok
  s7     118 it/s     371.0 req/s     754.45ms   0.00%   ok
  s8     158 it/s     351.2 req/s    1379.60ms   0.00%   ok
  s9     213 it/s     192.1 req/s    2275.78ms   0.00%   FAIL  p(95)<2000

  Peak sustained: 371.0 req/s at 118 it/s offered (s7)
  Throughput turned over at s7: the rungs above it offered more and delivered less, while still inside the latency budget.
  Knee at s9 (213 it/s offered): p(95)<2000
  dropped_iterations 604: above that rung the load generator was the limit, not the server.
```

**The peak is the highest rung by throughput, not the last rung that passed.** Those are different, and the run above shows why: s8 offered more than s7 and delivered less, but its p(95) of 1380ms was still inside the 2000ms budget, so it passed. The capacity of the system is s7's 371 req/s. A latency threshold is what makes k6 stop; throughput turnover is what tells you where the ceiling was, and the summary says so out loud when the two disagree.

`offered` is iterations/s and `achieved` is requests/s; they are different units because `iterations` is emitted by the executor and cannot carry the `step` tag. **Exit 99 is the success case here** — it means a rung broke. Exit 0 means the ladder topped out without breaking and the ceiling needs raising.

One thing to know before reading a `--ts` file by hand: the `step` tag is attached when a request is **issued**, but its sample is timestamped when the request **completes**. Near the knee that gap is over a second, so a rung's samples appear in the time series slightly later than the rung's own window. That is deliberate — it is what keeps a rung's numbers free of traffic from the ramp below it.

### Which container broke: `--watch`

The ladder measures the server from the outside, so it can say a rung was slow but not why. Add `--watch` and the run also samples `docker stats` and each replica's `/metrics`, then reports both tables against the same rungs:

```powershell
pnpm k6 mixed capacity --watch
```

```
  step    window         server%   mongo%   redis%   loop p99   heap MB
  s5      47-53s           245.8    172.3      4.2     29.9ms      58.0
  s6      55-61s           339.6    161.7      5.1    106.8ms      66.5
  s7      63-69s           324.5    204.0      5.0     36.1ms      82.6
  s8      71-77s           329.9     93.9      3.3    112.7ms      69.9

  Worst event loop lag was 112.7ms at s8, with server CPU 330% and mongo CPU 94%.
  The event loop was blocked while Mongo stayed cheap: the bottleneck is inside Node, not the database.
```

`server%` sums every replica, so 300% means three saturated cores; `loop p99` and `heap MB` are the worst replica in that window. Read it next to the ladder table — in the run above the server tier flattens at about 330% from s6 onward while Mongo falls away, which is what "Node is the ceiling" looks like.

Rung windows come from `k6 inspect` on the same script and the same `-e` flags, so they stay correct when `LADDER_SCALE` or `RATE` changes the shape.

Two caveats. The watcher samples every 3 seconds because `docker stats --no-stream` costs about two seconds a call, and it runs on the same machine as k6 and the stack, so it takes CPU away from the thing it is measuring — treat a `--watch` run as diagnosis, not as the run you quote numbers from. And nothing here reads MongoDB's own metrics; `mongo%` is container CPU, which is enough to rule Mongo in or out but not to explain a slow query.

Run it standalone against a test you start yourself with `pnpm k6:watch --out k6/results/manual-server.ndjson`, stop it with Ctrl+C, or re-read a finished file with `pnpm k6:watch --report <file>`.

`-e RATE=` scales the rung targets but never the durations, so the 12 rungs and their time windows survive it. `-e LADDER_SCALE=0.1` compresses the whole ladder to about 100 seconds for checking wiring; the summary stamps a warning on those numbers because a 6-second hold measures nothing. `-e KNEE_P95=1500` moves the latency budget.

## Environment variables

| Variable               | Default                 | Purpose                                                                                               |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `BASE_URL`             | `http://localhost:3000` | API root                                                                                              |
| `PROFILE`              | `load`                  | Profile name from the table above                                                                     |
| `VUS`                  | per profile             | Override peak VUs for closed-model profiles                                                           |
| `RATE`                 | per profile             | Override peak iterations/s for `capacity`. Scales the rung targets, never the durations               |
| `LADDER_SCALE`         | `1`                     | Compress the `capacity` ladder's durations for a wiring check; `0.1` runs it in ~100s                 |
| `KNEE_P95`             | `2000`                  | Per-rung latency budget in ms that defines the knee for `capacity`                                    |
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

| File                  | Used by                              | Contents                                                                                                                                                                                                        |
| --------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loadtest.env`        | both compose stacks, `loadtest:seed` | Server configuration for the isolated stack. Every value is fake and safe to commit. Sets the Cloudflare test Turnstile key so k6 can send a dummy token.                                                       |
| `prometheus.env`      | `pnpm k6 --prom`                     | Remote write endpoint, trend stats, push interval, stale markers. `K6_PROMETHEUS_RW_TREND_STATS` decides which `k6_http_req_duration_*` series exist, so it has to cover every stat a dashboard panel asks for. |
| `nginx/loadtest.conf` | `loadtest:up:multi`                  | Load balancer in front of the 3 replicas                                                                                                                                                                        |

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

### Finding the knee in a file you already have

`peak-rps` also builds a rate-versus-latency curve in 10-second windows, so a run that was never a `capacity` run can still be asked where it turned over:

```
Rate vs latency (10s windows, p(95) from a log histogram, +-2%):

       t      req/s        p(95)   failed
     30s      294.1      262.3ms    0.00%
     40s      321.7      491.2ms    0.00%
     50s      332.8      510.9ms    0.00%
     60s      317.4      574.6ms    0.00%   <- knee
     70s      312.2      574.6ms    0.00%

Knee at 60s: p(95) 574.6ms is 6.9x the 83.1ms healthy floor.
Peak sustained 10s before the knee: 340.9 rps
```

A window counts as broken when it fails more than 5% of its requests, or when p(95) sits above four times the healthy floor **while throughput has stopped climbing**. That last clause matters: during a ramp, latency rises because load rises, and calling that a knee would put the knee at the start of every `spike` run. The knee is where paying more latency stops buying more throughput. The floor is the median of the lowest quartile of window p(95)s, which survives a profile like `spike` that starts hot. A single bad window is ignored unless the next one is bad too.

The percentiles come from a log-bucket histogram rather than buffered samples, so memory stays flat on a soak — a 27MB stress file runs in a 128MB heap. Accuracy is within 2%; measured against exact percentiles on real windows the worst error was 1.91%.

Pass `--curve` to print every window instead of just the ones around the knee. If nothing broke, only the verdict prints.

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

The `capacity` profile replaces all of these with per-rung bounds and `abortOnFail`, because its job is to find the breaking point rather than guard an SLO — see [Capacity: finding the knee](#capacity-finding-the-knee).

Edit `config/thresholds.js` to change them.

A crossed threshold exits **99**, which pnpm surfaces as `Command failed with exit code 99`. That is the run working, not a broken script: `stress` and `spike` are built to push past the SLO, so exit 99 is their normal result and exit 0 is the surprise. Read the `FAIL` lines to see which budget went.

## Prometheus and Grafana

`kube-prometheus-stack` in the cluster has `enableRemoteWriteReceiver` turned on, so a local k6 run can push its results there.

```powershell
kubectl port-forward -n observability svc/kps-prometheus 9090:9090
pnpm k6 mixed load --prom
```

Then query `k6_http_req_duration_p95{testid="..."}` in Grafana, or import the official "k6 Prometheus" dashboard.

Point **Test ID** at the run you care about rather than `All`, which merges every run in the window.

Then repair the **Trend Metrics Query** dropdown, which arrives broken. It is the `$quantile_stat` variable behind `HTTP Request Duration`, `HTTP Latency Timings` and `HTTP Latency Stats`, and upstream ships it with **Metric regex** set to `k6_http_req_duration_`. Grafana hands that straight to Prometheus as a label matcher, and PromQL anchors `=~` at both ends, so it matches only a metric named exactly `k6_http_req_duration_` — nothing:

```bash
curl -sG http://localhost:9090/api/v1/label/__name__/values --data-urlencode 'match[]={__name__=~"k6_http_req_duration_"}'    # []
curl -sG http://localhost:9090/api/v1/label/__name__/values --data-urlencode 'match[]={__name__=~"k6_http_req_duration_.+"}'  # all seven
```

The variable resolves to zero options, silently, and the three panels query `k6_http_req_duration_` and read `No data` no matter what Prometheus holds. `Requests by URL` keeps working throughout because it names the stats directly instead of going through the variable, which is how you tell a broken variable apart from missing data.

Fix it in Dashboard settings -> Variables -> `quantile_stat`: set **Metric regex** to `k6_http_req_duration_.+`, run the query to confirm seven values appear, apply, then select `p95`. Leave the **Regex** field below it alone — that one runs in the browser, is not anchored, and already extracts the suffix correctly. The dashboard is not in Git, but Grafana runs with persistence, so the repair survives a pod restart.

`HTTP request failures` reading `No data` means nothing failed. It filters on `expected_response="false"`, and Prometheus has no series to show a zero for when no sample ever matched.

One line of noise to expect at the end of a `--prom` run:

```
ERRO[0164] Stopping output 0 failed  component=output-manager error="marking time series as stale failed: got status code: 400"
```

It fires after every metric has already been collected, so the summary, the HTML report and the `--ts` file are untouched, and the stale markers still land: the run’s series leave Prometheus well inside the five minutes they would otherwise linger. Prometheus logs no rejection for it and both `prometheus_tsdb_out_of_order_samples_total` and `prometheus_api_remote_write_invalid_labels_samples_total` stay at zero, so one batch of the shutdown write is refused for a reason the receiver never surfaces. Not worth chasing. Drop `K6_PROMETHEUS_RW_STALE_MARKERS` from `prometheus.env` if the line bothers you more than the five-minute tail does.

Before pushing a `capacity` run, trim the system tags. k6 tags every sample with `url` and `name`, and both carry real board ids, so one ordinary `mixed load` run produces **5,374** distinct label sets for `http_req_duration` where the same run without those two tags produces **12**. The `step` tag adds 14 values on top of whatever that number already is:

```powershell
$env:K6_SYSTEM_TAGS = "proto,status,method,group,scenario,expected_response"
pnpm k6 mixed capacity --prom
```

This is a precaution, not a diagnosis: the cluster's Prometheus carries around 512k head series of which kubelet and apiserver are the large live contributors, and two k6 runs accounted for roughly 3% of it. Whether `url` and `name` survive into Prometheus at all is worth confirming rather than assuming:

```powershell
curl -sG http://localhost:9090/api/v1/series --data-urlencode 'match[]=k6_http_reqs_total'
```

`pnpm k6:traffic-mix` reads the other direction — it queries the route distribution Prometheus has recorded and prints suggested weights for `mixed.js`. It only returns anything useful once the application metrics have been running in production for a few days.

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

const WINDOWS = [5, 10, 30];
const PLATEAU_FLOOR = 0.5;
const COUNTER_METRICS = new Set(["http_reqs", "dropped_iterations"]);
const CURVE_METRICS = new Set(["http_req_duration", "http_req_failed"]);

const KNEE_WINDOW = 10;
const KNEE_LATENCY_FACTOR = 4;
const KNEE_RPS_TOLERANCE = 1.02;
const KNEE_FAIL_RATE = 0.05;
const LOG_BASE = 1.04;
const LOG_DIVISOR = Math.log(LOG_BASE);
const HIST_BUCKETS = 340;

const usage = () => {
  console.error(`Usage: pnpm k6:peak-rps <file> [--curve]

<file> is a k6 time-series output, not the run summary. Generate one with:

  pnpm k6:load --out json=k6/results/load-ts.json.gz

A .gz suffix makes k6 gzip the file; this tool reads both forms.

--curve prints every window of the rate-vs-latency table instead of just the
ones around the knee.`);
  process.exit(1);
};

const bucketOf = (ms) => (ms < 1 ? 0 : Math.min(HIST_BUCKETS - 1, Math.round(Math.log(ms) / LOG_DIVISOR)));

const percentileOf = (histogram, count, quantile) => {
  if (count === 0) return 0;
  const target = quantile * count;
  let seen = 0;
  for (let index = 0; index < HIST_BUCKETS; index += 1) {
    seen += histogram[index];
    if (seen >= target) return LOG_BASE ** index;
  }
  return LOG_BASE ** (HIST_BUCKETS - 1);
};

const summaryFileError = (file) => {
  console.error(`${file} is a k6 run summary, not a time-series output.

The summary holds only aggregates - it has no per-second data, so no peak can be
recovered from it. Its http_reqs.rate is count divided by the whole run duration,
which averages the ramp-up and ramp-down in with the plateau.

Re-run with --out to get the time series:

  pnpm k6:load --out json=k6/results/load-ts.json.gz
  pnpm k6:peak-rps k6/results/load-ts.json.gz`);
  process.exit(1);
};

const openLines = (file) => {
  const stream = createReadStream(file);
  stream.on("error", (error) => {
    console.error(error.code === "ENOENT" ? `No such file: ${file}` : `Cannot read ${file}: ${error.message}`);
    process.exit(1);
  });
  const input = file.endsWith(".gz") ? stream.pipe(createGunzip()) : stream;
  return createInterface({ input, crlfDelay: Infinity });
};

const collect = async (file) => {
  const perSecond = new Map();
  const perScenario = new Map();
  const perSecondLatency = new Map();
  let firstLine = true;

  for await (const line of openLines(file)) {
    if (firstLine) {
      firstLine = false;
      if (!line.includes('"type"')) summaryFileError(file);
    }
    if (!line.includes('"Point"')) continue;

    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (CURVE_METRICS.has(parsed.metric)) {
      const at = Math.floor(Date.parse(parsed.data.time) / 1000);
      if (!Number.isFinite(at)) continue;
      let entry = perSecondLatency.get(at);
      if (entry === undefined) {
        entry = { reqs: 0, fails: 0, histogram: new Int32Array(HIST_BUCKETS) };
        perSecondLatency.set(at, entry);
      }
      if (parsed.metric === "http_req_duration") {
        entry.reqs += 1;
        entry.histogram[bucketOf(Number(parsed.data.value) || 0)] += 1;
      } else {
        entry.fails += Number(parsed.data.value) || 0;
      }
      continue;
    }
    if (!COUNTER_METRICS.has(parsed.metric)) continue;

    const second = Math.floor(Date.parse(parsed.data.time) / 1000);
    if (!Number.isFinite(second)) continue;
    const value = Number(parsed.data.value) || 0;

    if (!perSecond.has(parsed.metric)) perSecond.set(parsed.metric, new Map());
    const buckets = perSecond.get(parsed.metric);
    buckets.set(second, (buckets.get(second) ?? 0) + value);

    if (parsed.metric !== "http_reqs") continue;
    const scenario = parsed.data.tags?.scenario;
    if (!scenario) continue;
    if (!perScenario.has(scenario)) perScenario.set(scenario, new Map());
    const flow = perScenario.get(scenario);
    flow.set(second, (flow.get(second) ?? 0) + value);
  }

  return { perSecond, perScenario, perSecondLatency };
};

const series = (buckets) => {
  if (buckets.size === 0) return [];
  const seconds = [...buckets.keys()].sort((a, b) => a - b);
  const from = seconds[0];
  const to = seconds[seconds.length - 1];
  const filled = [];
  for (let second = from; second <= to; second += 1) filled.push(buckets.get(second) ?? 0);
  return filled.length <= 2 ? filled : filled.slice(1, -1);
};

const seriesStart = (buckets) => {
  const seconds = [...buckets.keys()].sort((a, b) => a - b);
  const span = seconds[seconds.length - 1] - seconds[0] + 1;
  return span <= 2 ? seconds[0] : seconds[0] + 1;
};

const peakSustained = (values, window) => {
  if (values.length < window) return undefined;
  let sum = 0;
  let peak = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index];
    if (index >= window) sum -= values[index - window];
    if (index >= window - 1) peak = Math.max(peak, sum / window);
  }
  return peak;
};

const median = (values) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

const plateau = (values) => {
  const peak = Math.max(...values, 0);
  return median(values.filter((value) => value >= peak * PLATEAU_FLOOR));
};

const rps = (value) => (value === undefined ? "-" : `${value.toFixed(1)} rps`);
const row = (label, value, note = "") => `  ${label.padEnd(22)} ${rps(value).padStart(12)}${note}`;

const curveWindows = (perSecondLatency, startSecond, spanSeconds) => {
  if (perSecondLatency.size === 0) return [];
  const totals = [];
  for (let offset = 0; offset < spanSeconds; offset += KNEE_WINDOW) {
    totals.push({ offset, reqs: 0, fails: 0, histogram: new Int32Array(HIST_BUCKETS) });
  }
  for (const [second, entry] of perSecondLatency) {
    const offset = second - startSecond;
    if (offset < 0 || offset >= spanSeconds) continue;
    const target = totals[Math.floor(offset / KNEE_WINDOW)];
    target.reqs += entry.reqs;
    target.fails += entry.fails;
    for (let index = 0; index < HIST_BUCKETS; index += 1) target.histogram[index] += entry.histogram[index];
  }
  return totals
    .filter((total) => total.reqs > 0)
    .map((total) => ({
      offset: total.offset,
      rps: total.reqs / KNEE_WINDOW,
      p95: percentileOf(total.histogram, total.reqs, 0.95),
      failRate: total.fails / total.reqs,
    }));
};

const findKnee = (windows) => {
  const sorted = windows.map((window) => window.p95).sort((a, b) => a - b);
  const baseline = median(sorted.slice(0, Math.max(1, Math.floor(sorted.length / 4))));

  let best = 0;
  const stalled = windows.map((window) => {
    const flat = window.rps <= best * KNEE_RPS_TOLERANCE;
    best = Math.max(best, window.rps);
    return flat;
  });

  const isBad = (window, index) =>
    window.failRate >= KNEE_FAIL_RATE || (stalled[index] && window.p95 >= KNEE_LATENCY_FACTOR * baseline);

  for (let index = 0; index < windows.length; index += 1) {
    if (!isBad(windows[index], index)) continue;
    const confirmed = index + 1 < windows.length ? isBad(windows[index + 1], index + 1) : true;
    if (confirmed) return { knee: windows[index], baseline };
  }
  return { knee: undefined, baseline };
};

const argv = process.argv.slice(2);
const curve = argv.includes("--curve");
const file = argv.find((argument) => !argument.startsWith("-"));
if (!file) usage();

const { perSecond, perScenario, perSecondLatency } = await collect(file);
const requests = series(perSecond.get("http_reqs") ?? new Map());

if (requests.length === 0) {
  console.error(`No http_reqs samples in ${file}. Was it produced by "k6 run --out json="?`);
  process.exit(1);
}

const total = requests.reduce((sum, value) => sum + value, 0);
const average = total / requests.length;

console.log(`\nFile: ${file}   span: ${requests.length}s   requests: ${total.toLocaleString("en-US")}\n`);
console.log(row("peak 1s", Math.max(...requests)));
for (const window of WINDOWS) console.log(row(`peak sustained ${window}s`, peakSustained(requests, window)));
console.log(row("plateau (median)", plateau(requests)));
console.log(row("summary avg", average, "   <- http_reqs.rate, ramps included"));

const dropped = series(perSecond.get("dropped_iterations") ?? new Map());
if (dropped.length > 0 && Math.max(...dropped) > 0) {
  const droppedTotal = dropped.reduce((sum, value) => sum + value, 0);
  console.log(
    `\nDropped iterations: ${droppedTotal.toLocaleString("en-US")} total, peak ${Math.max(...dropped).toFixed(0)}/s` +
      `\nk6 could not start iterations fast enough, so the numbers above are a` +
      `\nfloor on demand rather than a measurement of server capacity.`
  );
}

if (perScenario.size > 0) {
  const window = WINDOWS[1];
  console.log(`\nPer scenario (peak sustained ${window}s):`);
  const rows = [...perScenario.entries()]
    .map(([scenario, buckets]) => ({ scenario, peak: peakSustained(series(buckets), window) ?? 0 }))
    .sort((a, b) => b.peak - a.peak);
  for (const entry of rows) console.log(`  ${entry.peak.toFixed(1).padStart(10)}  ${entry.scenario}`);
}

const windows = curveWindows(perSecondLatency, seriesStart(perSecond.get("http_reqs")), requests.length);

if (windows.length >= 3) {
  const { knee, baseline } = findKnee(windows);
  const shown =
    curve || knee === undefined
      ? windows
      : windows.filter((w) => w.offset >= knee.offset - 3 * KNEE_WINDOW && w.offset <= knee.offset + KNEE_WINDOW);

  if (knee !== undefined || curve) {
    console.log(
      `\nRate vs latency (${KNEE_WINDOW}s windows, p(95) from a log histogram, +-${(((LOG_BASE - 1) / 2) * 100).toFixed(0)}%):\n`
    );
    console.log(`  ${"t".padStart(6)}  ${"req/s".padStart(9)}  ${"p(95)".padStart(11)}  ${"failed".padStart(7)}`);
    for (const window of shown) {
      const marker = knee !== undefined && window.offset === knee.offset ? "   <- knee" : "";
      console.log(
        `  ${`${window.offset}s`.padStart(6)}  ${window.rps.toFixed(1).padStart(9)}  ` +
          `${`${window.p95.toFixed(1)}ms`.padStart(11)}  ${`${(window.failRate * 100).toFixed(2)}%`.padStart(7)}${marker}`
      );
    }
  }

  if (knee === undefined) {
    console.log(
      `\nNo knee: throughput never stalled while p(95) held above ${KNEE_LATENCY_FACTOR}x the ${baseline.toFixed(1)}ms` +
        `\nhealthy floor, and no window failed more than ${(KNEE_FAIL_RATE * 100).toFixed(0)}% of its requests.` +
        `\nRising latency alone is not a knee when throughput is still climbing. Run --curve to see every window.`
    );
  } else {
    const before = peakSustained(requests.slice(0, knee.offset), KNEE_WINDOW);
    console.log(
      `\nKnee at ${knee.offset}s: p(95) ${knee.p95.toFixed(1)}ms is ${(knee.p95 / baseline).toFixed(1)}x the ${baseline.toFixed(1)}ms healthy floor.`
    );
    console.log(`Peak sustained ${KNEE_WINDOW}s before the knee: ${rps(before)}`);
  }
}

console.log(
  `\nQuote "peak sustained 10s". The 1s peak is scheduling noise, and the summary` +
    `\naverage is not comparable across profiles because each has a different ramp.\n`
);

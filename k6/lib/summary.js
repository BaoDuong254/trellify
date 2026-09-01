import { TEST_ID } from "../config/env.js";
import { capacityLadder, profileName } from "../config/profiles.js";

const MS_METRICS = new Set(["ms", "time"]);

const STEP_ROW = /\{step:(s\d+|ramp|warm|tail)\}$/;

const statOf = (metrics, name, key) => (metrics[name] ? metrics[name].values[key] : undefined);

const failuresOf = (metrics, names) => {
  const failed = [];
  for (const name of names) {
    const thresholds = (metrics[name] || {}).thresholds || {};
    for (const key of Object.keys(thresholds)) if (!thresholds[key].ok) failed.push(key);
  }
  return failed;
};

const ladderFor = (data) => {
  const ladder = capacityLadder();
  if (ladder === null) return null;

  const metrics = data.metrics;
  const elapsedSeconds = (data.state ? data.state.testRunDurationMs : 0) / 1000;
  const rows = [];

  for (const step of ladder.steps) {
    const reqs = `http_reqs{step:${step.id}}`;
    const count = statOf(metrics, reqs, "count") || 0;
    if (count === 0) continue;

    const duration = `http_req_duration{step:${step.id}}`;
    const failed = `http_req_failed{step:${step.id}}`;
    const held = Math.max(0.001, Math.min(step.holdSeconds, elapsedSeconds - step.holdStartMs / 1000));

    rows.push({
      id: step.id,
      offered: step.offered,
      achieved: count / held,
      p95: statOf(metrics, duration, "p(95)") || 0,
      failRate: statOf(metrics, failed, "rate") || 0,
      failed: failuresOf(metrics, [duration, failed, reqs]),
    });
  }

  const kneeIndex = rows.findIndex((row) => row.failed.length > 0);
  const healthy = kneeIndex === -1 ? rows : rows.slice(0, kneeIndex);
  const peak = healthy.reduce((best, row) => (best === null || row.achieved > best.achieved ? row : best), null);

  return {
    rows,
    knee: kneeIndex === -1 ? null : rows[kneeIndex],
    peak,
    turnedOverEarly: peak !== null && healthy.length > 0 && peak !== healthy[healthy.length - 1],
    dropped: statOf(metrics, "dropped_iterations", "count") || 0,
    droppedFailed: failuresOf(metrics, ["dropped_iterations"]).length > 0,
    timeScale: ladder.timeScale,
    ceiling: ladder.steps[ladder.steps.length - 1].offered,
  };
};

const verdictLines = (ladder) => {
  const lines = [];
  if (ladder.knee === null) {
    if (ladder.peak !== null) {
      lines.push(
        `Peak sustained: ${ladder.peak.achieved.toFixed(1)} req/s at ${ladder.peak.offered} it/s offered (${ladder.peak.id})`
      );
    }
    lines.push(
      ladder.turnedOverEarly
        ? `No knee, but throughput turned over at ${ladder.peak.id} while staying inside the latency budget. Loosen KNEE_P95 or read the table.`
        : `No knee: the ladder topped out at ${ladder.ceiling} it/s without breaking. Raise the ceiling.`
    );
    return lines;
  }
  if (ladder.peak === null) {
    lines.push(`No healthy rung: the first rung at ${ladder.knee.offered} it/s already broke. Lower the rungs.`);
  } else {
    lines.push(
      `Peak sustained: ${ladder.peak.achieved.toFixed(1)} req/s at ${ladder.peak.offered} it/s offered (${ladder.peak.id})`
    );
    if (ladder.turnedOverEarly) {
      lines.push(
        `Throughput turned over at ${ladder.peak.id}: the rungs above it offered more and delivered less, while still inside the latency budget.`
      );
    }
  }
  lines.push(`Knee at ${ladder.knee.id} (${ladder.knee.offered} it/s offered): ${ladder.knee.failed.join(", ")}`);
  if (ladder.droppedFailed) {
    lines.push(
      `dropped_iterations ${ladder.dropped}: above that rung the load generator was the limit, not the server.`
    );
  }
  return lines;
};

const format = (metric, key, value) => {
  if (value === undefined || value === null) return "-";
  if (key === "rate" && metric.type === "rate") return `${(value * 100).toFixed(2)}%`;
  if (MS_METRICS.has(metric.contains)) return `${value.toFixed(2)}ms`;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const KEY_ORDER = ["count", "rate", "avg", "min", "med", "p(90)", "p(95)", "p(99)", "max", "value"];

const rowsFor = (metrics) =>
  Object.keys(metrics)
    .sort()
    .map((name) => {
      const metric = metrics[name];
      const values = KEY_ORDER.filter((key) => metric.values[key] !== undefined).map(
        (key) => `${key}=${format(metric, key, metric.values[key])}`
      );
      const thresholds = metric.thresholds || {};
      const failed = Object.keys(thresholds).filter((key) => !thresholds[key].ok);
      return { name, values, failed };
    });

const escapeHtml = (value) =>
  String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

const renderLadderText = (ladder) => {
  if (ladder === null || ladder.rows.length === 0) return [];
  const lines = [];
  if (ladder.timeScale !== 1) {
    lines.push(`  LADDER_SCALE=${ladder.timeScale} — wiring check only, do not quote these numbers.`, ``);
  }
  lines.push(`  Capacity ladder — hold windows only, ramps excluded`, ``);
  lines.push(`  step   offered      achieved         p(95)   failed`);
  for (const row of ladder.rows) {
    const verdict = row.failed.length > 0 ? `FAIL  ${row.failed.join(", ")}` : "ok";
    lines.push(
      `  ${row.id.padEnd(5)} ${`${row.offered} it/s`.padStart(10)} ${`${row.achieved.toFixed(1)} req/s`.padStart(13)} ` +
        `${`${row.p95.toFixed(2)}ms`.padStart(12)} ${`${(row.failRate * 100).toFixed(2)}%`.padStart(8)}   ${verdict}`
    );
  }
  lines.push(``);
  for (const line of verdictLines(ladder)) lines.push(`  ${line}`);
  lines.push(``);
  return lines;
};

const renderText = (rows, profile, ladder) => {
  const lines = [``, `  Trellify k6 — profile=${profile} testid=${TEST_ID}`, ``, ...renderLadderText(ladder)];
  for (const row of rows) {
    const marker = row.failed.length > 0 ? "FAIL" : "  ok";
    lines.push(`  ${marker}  ${row.name.padEnd(46)} ${row.values.join("  ")}`);
    for (const threshold of row.failed) lines.push(`        threshold breached: ${threshold}`);
  }
  lines.push(``);
  return lines.join("\n");
};

const renderLadderHtml = (ladder) => {
  if (ladder === null || ladder.rows.length === 0) return "";
  const scaleWarning =
    ladder.timeScale === 1
      ? ""
      : `<p class="meta">LADDER_SCALE=${escapeHtml(ladder.timeScale)} &middot; wiring check only, do not quote these numbers.</p>`;
  return `${scaleWarning}
<h2>Capacity ladder</h2>
<p class="meta">Hold windows only, ramps excluded. ${verdictLines(ladder).map(escapeHtml).join(" &middot; ")}</p>
<div class="scroll">
<table>
<thead><tr><th>Step</th><th>Offered</th><th>Achieved</th><th>p(95)</th><th>Failed</th><th>Verdict</th></tr></thead>
<tbody>
${ladder.rows
  .map(
    (row) => `<tr class="${row.failed.length > 0 ? "failed" : ""}">
  <td class="name">${escapeHtml(row.id)}</td>
  <td class="num">${escapeHtml(row.offered)} it/s</td>
  <td class="num">${escapeHtml(row.achieved.toFixed(1))} req/s</td>
  <td class="num">${escapeHtml(row.p95.toFixed(2))}ms</td>
  <td class="num">${escapeHtml((row.failRate * 100).toFixed(2))}%</td>
  <td class="values">${row.failed.length > 0 ? escapeHtml(row.failed.join(", ")) : "ok"}</td>
</tr>`
  )
  .join("\n")}
</tbody>
</table>
</div>
`;
};

const renderHtml = (rows, profile, ladder) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Trellify k6 — ${escapeHtml(profile)}</title>
<style>
  :root { color-scheme: light dark; --bg: #fbfbfa; --fg: #1c1c1a; --muted: #6b6b66; --line: #e2e2dd; --fail: #b3261e; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #17181a; --fg: #e8e8e4; --muted: #9a9a94; --line: #2e2f32; --fail: #f2b8b5; }
  }
  body { margin: 0; padding: 2rem 1.5rem; background: var(--bg); color: var(--fg);
         font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  h1 { font-size: 1.25rem; margin: 0 0 .25rem; }
  h2 { font-size: 1rem; margin: 2rem 0 .25rem; }
  td.num { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap; }
  p.meta { color: var(--muted); margin: 0 0 1.5rem; }
  .scroll { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; min-width: 640px; }
  th, td { text-align: left; padding: .5rem .75rem; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { font-weight: 600; color: var(--muted); font-size: .8125rem; text-transform: uppercase; letter-spacing: .04em; }
  td.name { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap; }
  td.values { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--muted); }
  tr.failed td { color: var(--fail); }
  .breach { display: block; font-size: .8125rem; }
</style>
</head>
<body>
<h1>Trellify k6 results</h1>
<p class="meta">profile <strong>${escapeHtml(profile)}</strong> &middot; testid <strong>${escapeHtml(TEST_ID)}</strong> &middot; generated ${escapeHtml(new Date().toISOString())}</p>
${renderLadderHtml(ladder)}
<h2>Metrics</h2>
<div class="scroll">
<table>
<thead><tr><th>Metric</th><th>Values</th></tr></thead>
<tbody>
${rows
  .map(
    (row) => `<tr class="${row.failed.length > 0 ? "failed" : ""}">
  <td class="name">${escapeHtml(row.name)}</td>
  <td class="values">${escapeHtml(row.values.join("  "))}${row.failed
    .map((threshold) => `<span class="breach">threshold breached: ${escapeHtml(threshold)}</span>`)
    .join("")}</td>
</tr>`
  )
  .join("\n")}
</tbody>
</table>
</div>
</body>
</html>
`;

export function buildSummary(data) {
  const profile = profileName();
  const ladder = ladderFor(data);
  const rows = rowsFor(data.metrics).filter((row) => !STEP_ROW.test(row.name));
  const directory = __ENV.SUMMARY_DIR || "k6/results";
  const name = __ENV.RUN_NAME || profile;
  return {
    stdout: renderText(rows, profile, ladder),
    [`${directory}/${name}.json`]: JSON.stringify(data, null, 2),
    [`${directory}/${name}.html`]: renderHtml(rows, profile, ladder),
  };
}

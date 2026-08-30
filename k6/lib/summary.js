import { TEST_ID } from "../config/env.js";
import { profileName } from "../config/profiles.js";

const MS_METRICS = new Set(["ms", "time"]);

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

const renderText = (rows, profile) => {
  const lines = [``, `  Trellify k6 — profile=${profile} testid=${TEST_ID}`, ``];
  for (const row of rows) {
    const marker = row.failed.length > 0 ? "FAIL" : "  ok";
    lines.push(`  ${marker}  ${row.name.padEnd(46)} ${row.values.join("  ")}`);
    for (const threshold of row.failed) lines.push(`        threshold breached: ${threshold}`);
  }
  lines.push(``);
  return lines.join("\n");
};

const renderHtml = (rows, profile) => `<!doctype html>
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
  const rows = rowsFor(data.metrics);
  const directory = __ENV.SUMMARY_DIR || "k6/results";
  return {
    stdout: renderText(rows, profile),
    [`${directory}/${profile}.json`]: JSON.stringify(data, null, 2),
    [`${directory}/${profile}.html`]: renderHtml(rows, profile),
  };
}

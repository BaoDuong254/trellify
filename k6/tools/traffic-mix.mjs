const PROM_URL = process.env.PROM_URL ?? "http://localhost:9090";
const WINDOW = process.env.WINDOW ?? "7d";

// Same route-to-group mapping as k6/lib/api.js. Anything unmatched is reported
// separately rather than silently folded into a group.
const GROUP_OF_ROUTE = [
  [/^\/api\/v1\/users\/(login|logout|refresh_token)$/, "auth"],
  [/^\/api\/v1\/boards$/, (method) => (method === "GET" ? "read" : "write")],
  [/^\/api\/v1\/boards\/:id$/, (method) => (method === "GET" ? "read" : "write")],
  [/^\/api\/v1\/boards\//, "write"],
  [/^\/api\/v1\/(columns|cards)/, "write"],
];

const classify = (route, method) => {
  for (const [pattern, group] of GROUP_OF_ROUTE) {
    if (pattern.test(route)) return typeof group === "function" ? group(method) : group;
  }
  return undefined;
};

const query = async (expression) => {
  const url = `${PROM_URL}/api/v1/query?query=${encodeURIComponent(expression)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Prometheus returned ${response.status} for ${url}`);
  const payload = await response.json();
  if (payload.status !== "success") throw new Error(`Prometheus error: ${JSON.stringify(payload)}`);
  return payload.data.result;
};

const rows = await query(`sum by (route, method) (increase(http_request_duration_seconds_count[${WINDOW}]))`);

if (rows.length === 0) {
  console.error(`No samples in the last ${WINDOW}. Metrics need to run in production first.`);
  process.exit(1);
}

const totals = { read: 0, write: 0, auth: 0 };
const unmatched = [];
let grandTotal = 0;

for (const row of rows) {
  const { route = "", method = "" } = row.metric;
  const count = Number(row.value[1]);
  if (!Number.isFinite(count) || count <= 0) continue;

  const group = classify(route, method);
  if (group) {
    totals[group] += count;
    grandTotal += count;
  } else {
    unmatched.push({ route, method, count });
  }
}

console.log(`Window: ${WINDOW}   Source: ${PROM_URL}\n`);
console.log("Per endpoint:");
for (const row of rows.sort((a, b) => Number(b.value[1]) - Number(a.value[1]))) {
  const count = Math.round(Number(row.value[1]));
  if (count <= 0) continue;
  const group = classify(row.metric.route ?? "", row.metric.method ?? "") ?? "-";
  console.log(`  ${String(count).padStart(10)}  ${group.padEnd(6)} ${row.metric.method} ${row.metric.route}`);
}

console.log("\nSuggested weights for k6/scenarios/mixed.js:");
for (const [group, count] of Object.entries(totals)) {
  const share = grandTotal > 0 ? count / grandTotal : 0;
  console.log(`  ${group.padEnd(6)} ${(share * 100).toFixed(1).padStart(5)}%   -> ${share.toFixed(2)}`);
}

if (unmatched.length > 0) {
  console.log("\nNot covered by any k6 flow (consider adding a scenario):");
  for (const row of unmatched) console.log(`  ${Math.round(row.count)}  ${row.method} ${row.route}`);
}

console.log(
  "\nWeights are per HTTP request. mixed.js weights are per iteration, and a read" +
    "\niteration makes 2 requests while a write iteration makes 8 — divide accordingly."
);

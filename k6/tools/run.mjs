import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const SCENARIOS = {
  smoke: { file: "k6/scenarios/smoke.js", profile: "smoke", covers: "All three flows once, sequentially" },
  mixed: { file: "k6/scenarios/mixed.js", covers: "read 70% / write 25% / auth 5% in parallel" },
  "board-read": { file: "k6/scenarios/board-read.js", covers: "Read flow alone" },
  "board-write": { file: "k6/scenarios/board-write.js", covers: "Write flow alone" },
  auth: { file: "k6/scenarios/auth.js", covers: "Auth flow alone" },
  "socket-fanout": { file: "k6/scenarios/socket-fanout.js", profile: "socket", covers: "Socket.io fan-out cost" },
};

const PROFILES = {
  smoke: "1 VU, 30s",
  baseline: "3 VUs, 90s, think time forced to 0",
  load: "0 to 50 VUs over 5 min",
  stress: "Steps to 200 VUs",
  spike: "10 to 200 VUs in 20s",
  soak: "20 VUs, 30 min",
  capacity: "50 to 400 iterations/s, aborts at the knee",
};

const DEFAULT_PROFILE = "load";
const RESULTS_DIR = "k6/results";
const PROM_ENV_FILE = "k6/prometheus.env";
const OWN_FLAGS = new Set(["--prom", "--ts", "--help", "-h"]);

const pad = (value, width) => value.padEnd(width);

const usage = () => {
  const scenarioWidth = Math.max(...Object.keys(SCENARIOS).map((key) => key.length));
  const profileWidth = Math.max(...Object.keys(PROFILES).map((key) => key.length));
  return `Usage: pnpm k6 [scenario] [profile] [flags]

Run with no arguments to be prompted for each choice.

Scenarios:
${Object.entries(SCENARIOS)
  .map(
    ([key, value]) =>
      `  ${pad(key, scenarioWidth)}  ${value.covers}${value.profile ? ` (profile: ${value.profile})` : ""}`
  )
  .join("\n")}

Profiles:
${Object.entries(PROFILES)
  .map(([key, value]) => `  ${pad(key, profileWidth)}  ${value}`)
  .join("\n")}

Flags:
  --prom    Push results to Prometheus using ${PROM_ENV_FILE}
  --ts      Also write a time-series file for pnpm k6:peak-rps
  --help    Show this message

Any other flag is passed straight through to k6, so -e VUS=100 and
--out csv=... work as usual. Put the scenario and profile first.

Examples:
  pnpm k6
  pnpm k6 smoke
  pnpm k6 mixed load --ts
  pnpm k6 board-read stress -e VUS=100`;
};

const die = (message) => {
  console.error(message);
  process.exit(1);
};

const parseEnvFile = (path) => {
  const values = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    const quoted = value.length > 1 && (value.startsWith('"') || value.startsWith("'"));
    if (quoted && value.endsWith(value[0])) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
};

const splitArgs = (argv) => {
  const positionals = [];
  const passthrough = [];
  const flags = new Set();
  let stopped = false;

  for (const arg of argv) {
    if (OWN_FLAGS.has(arg)) {
      flags.add(arg);
      continue;
    }
    if (arg.startsWith("-")) stopped = true;
    if (stopped) passthrough.push(arg);
    else positionals.push(arg);
  }
  return { positionals, passthrough, flags };
};

const choose = async (rl, label, entries, fallback) => {
  const keys = Object.keys(entries);
  const width = Math.max(...keys.map((key) => key.length));
  console.log(`\n${label}`);
  keys.forEach((key, index) => {
    const marker = key === fallback ? " (default)" : "";
    console.log(
      `  ${String(index + 1).padStart(2)}. ${pad(key, width)}  ${entries[key].covers ?? entries[key]}${marker}`
    );
  });

  for (;;) {
    const answer = (await rl.question(`> [${fallback}] `)).trim();
    if (answer === "") return fallback;
    const byIndex = Number.parseInt(answer, 10);
    if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= keys.length) return keys[byIndex - 1];
    if (keys.includes(answer)) return answer;
    console.log(`  Not one of: ${keys.join(", ")}`);
  }
};

const confirm = async (rl, label) => {
  const answer = (await rl.question(`${label} [y/N] `)).trim().toLowerCase();
  return answer === "y" || answer === "yes";
};

const { positionals, passthrough, flags } = splitArgs(process.argv.slice(2));

if (flags.has("--help") || flags.has("-h")) {
  console.log(usage());
  process.exit(0);
}

const [scenarioArg, profileArg, ...extra] = positionals;
if (extra.length > 0) die(`Unexpected argument "${extra[0]}".\n\n${usage()}`);

if (scenarioArg !== undefined && SCENARIOS[scenarioArg] === undefined) {
  die(`Unknown scenario "${scenarioArg}". Pick one of: ${Object.keys(SCENARIOS).join(", ")}`);
}
if (profileArg !== undefined && PROFILES[profileArg] === undefined) {
  die(`Unknown profile "${profileArg}". Pick one of: ${Object.keys(PROFILES).join(", ")}`);
}

const interactive = scenarioArg === undefined;
if (interactive && !process.stdin.isTTY) {
  die(`No scenario given and stdin is not a terminal, so there is nothing to prompt.\n\n${usage()}`);
}

let scenarioKey = scenarioArg;
let profile = profileArg;
let prom = flags.has("--prom");
let timeSeries = flags.has("--ts");

if (interactive) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    scenarioKey = await choose(rl, "Scenario", SCENARIOS, "mixed");
    if (SCENARIOS[scenarioKey].profile === undefined) {
      profile = await choose(rl, "Profile", PROFILES, DEFAULT_PROFILE);
    }
    console.log("");
    if (!prom) prom = await confirm(rl, "Push results to Prometheus?");
    if (!timeSeries) timeSeries = await confirm(rl, "Write a time-series file for peak RPS?");
  } finally {
    rl.close();
  }
}

const scenario = SCENARIOS[scenarioKey];
if (!existsSync(scenario.file)) die(`Scenario file is missing: ${scenario.file}`);

if (scenario.profile !== undefined) {
  if (profile !== undefined && profile !== scenario.profile) {
    console.log(`Note: the ${scenarioKey} scenario defines its own load shape, so profile "${profile}" is ignored.`);
  }
  profile = scenario.profile;
} else if (profile === undefined) {
  profile = DEFAULT_PROFILE;
  console.log(`No profile given, using "${profile}".`);
}

const runName = scenario.profile === undefined ? `${scenarioKey}-${profile}` : scenarioKey;
const timeSeriesPath = `${RESULTS_DIR}/${runName}-ts.json.gz`;

const args = ["run", "-e", `PROFILE=${profile}`, "-e", `RUN_NAME=${runName}`];
const env = { ...process.env };

if (prom) {
  if (!existsSync(PROM_ENV_FILE)) die(`--prom needs ${PROM_ENV_FILE}, which does not exist.`);
  const promEnv = parseEnvFile(PROM_ENV_FILE);
  Object.assign(env, promEnv);
  args.push("-o", "experimental-prometheus-rw");
  console.log(`\nLoaded from ${PROM_ENV_FILE}: ${Object.keys(promEnv).join(", ")}`);
}

if (timeSeries) args.push("--out", `json=${timeSeriesPath}`);

args.push(scenario.file, ...passthrough);

console.log(`\n> k6 ${args.join(" ")}\n`);

const result = spawnSync("k6", args, { stdio: "inherit", env });

if (result.error) {
  die(
    result.error.code === "ENOENT"
      ? `k6 is not on your PATH. Install it with "winget install GrafanaLabs.k6", then open a new terminal.`
      : `Could not start k6: ${result.error.message}`
  );
}

if (timeSeries && result.status === 0) {
  console.log(`\nTime series written. Get the peak with:\n  pnpm k6:peak-rps ${timeSeriesPath}`);
}

process.exit(result.status ?? 1);

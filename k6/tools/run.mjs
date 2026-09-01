import { spawn, spawnSync } from "node:child_process";
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
  capacity: "Arrival-rate ladder, 25 to 800 iterations/s, aborts at the knee",
};

const DEFAULT_PROFILE = "load";
const RESULTS_DIR = "k6/results";
const PROM_ENV_FILE = "k6/prometheus.env";
const OWN_FLAGS = new Set(["--prom", "--ts", "--watch", "--help", "-h"]);
const CAPACITY_PROFILE = "capacity";
const WATCHER = "k6/tools/watch-server.mjs";
const THRESHOLD_FAILURE_STATUS = 99;
const COMPLETED_STATUSES = new Set([0, THRESHOLD_FAILURE_STATUS]);

const secondsOf = (duration) => {
  const match = /^(?:(\d+)m)?(?:([\d.]+)s)?$/.exec(duration.trim());
  return match === null ? 0 : Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
};

const envArgs = (tokens) => {
  const pairs = [];
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index] === "-e" && index + 1 < tokens.length) pairs.push("-e", tokens[index + 1]);
  }
  return pairs;
};

const ladderSteps = (scenarioFile, profileName, forwarded) => {
  const inspected = spawnSync("k6", ["inspect", "-e", `PROFILE=${profileName}`, ...envArgs(forwarded), scenarioFile], {
    encoding: "utf8",
  });
  if (inspected.status !== 0) return undefined;

  let stages;
  try {
    const options = JSON.parse(inspected.stdout);
    const first = Object.values(options.scenarios ?? {})[0];
    stages = first === undefined ? undefined : first.stages;
  } catch {
    return undefined;
  }
  if (!Array.isArray(stages) || stages.length < 3) return undefined;

  const steps = [];
  let elapsed = secondsOf(stages[0].duration);
  for (let index = 1; index + 1 < stages.length; index += 2) {
    const holdFrom = elapsed + secondsOf(stages[index].duration);
    const holdTo = holdFrom + secondsOf(stages[index + 1].duration);
    steps.push(`s${(index - 1) / 2}:${Math.round(holdFrom)}-${Math.round(holdTo)}`);
    elapsed = holdTo;
  }
  return steps.join(",");
};

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
  --watch   Sample server CPU and event loop lag during the run, then report
            which container saturated
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
let watch = flags.has("--watch");

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
    if (!watch) watch = await confirm(rl, "Watch server CPU and event loop during the run?");
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

const watchPath = `${RESULTS_DIR}/${runName}-server.ndjson`;
let watcher;

if (watch) {
  const watchArgs = [WATCHER, "--out", watchPath];
  const steps = ladderSteps(scenario.file, profile, passthrough);
  if (steps !== undefined) watchArgs.push("--steps", steps);
  watcher = spawn(process.execPath, watchArgs, { stdio: "ignore" });
  console.log(`Watching server CPU and event loop into ${watchPath}\n`);
}

const result = spawnSync("k6", args, { stdio: "inherit", env });

if (watcher !== undefined) {
  watcher.kill();
  spawnSync(process.execPath, [WATCHER, "--report", watchPath], { stdio: "inherit" });
}

if (result.error) {
  die(
    result.error.code === "ENOENT"
      ? `k6 is not on your PATH. Install it with "winget install GrafanaLabs.k6", then open a new terminal.`
      : `Could not start k6: ${result.error.message}`
  );
}

if (profile === CAPACITY_PROFILE) {
  console.log(
    result.status === THRESHOLD_FAILURE_STATUS
      ? `\nExit ${THRESHOLD_FAILURE_STATUS} is the result you wanted: a rung broke, so the ladder found the knee. Read the ladder table above.`
      : `\nExit ${result.status} means the ladder topped out without breaking. Raise the rungs in k6/config/profiles.js.`
  );
} else if (result.status === THRESHOLD_FAILURE_STATUS) {
  console.log(
    `\nk6 exits ${THRESHOLD_FAILURE_STATUS} because a threshold was crossed. The run itself completed, and stress and spike are built to cross one.`
  );
}

if (timeSeries && COMPLETED_STATUSES.has(result.status) && existsSync(timeSeriesPath)) {
  console.log(`\nTime series written. Get the peak with:\n  pnpm k6:peak-rps ${timeSeriesPath}`);
  if (profile === CAPACITY_PROFILE) {
    console.log(`  pnpm k6:peak-rps ${timeSeriesPath} --curve`);
  }
}

process.exit(result.status ?? 1);

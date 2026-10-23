import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const NAMESPACE = "trellify";
const FIRST_LOCAL_PORT = 19464;
const DEFAULT_INTERVAL = 3;
const FETCH_TIMEOUT_MS = 2500;
const FALLBACK_BUCKET_SECONDS = 30;
const SATURATED_REPLICA_CPU = 85;

const NODE_METRICS = {
  lagP99: "nodejs_eventloop_lag_p99_seconds",
  heapUsed: "nodejs_heap_size_used_bytes",
  cpuSeconds: "process_cpu_seconds_total",
};

const usage = () => {
  console.error(`Usage:
  node k6/tools/watch-server.mjs --out <file> [--interval 3] [--steps <spec>]
  node k6/tools/watch-server.mjs --report <file>

Samples pod CPU from the kubelet and each server pod's /metrics (through
kubectl port-forward) on the current kubectl context while a load test runs,
then reports which pod saturated and when. Stop it with Ctrl+C.

  --out <file>     write samples here and print the report on exit
  --report <file>  print the report for an existing sample file and exit
  --interval <s>   seconds between samples, default ${DEFAULT_INTERVAL}
  --steps <spec>   label rows with ladder steps, as "s0:65-125,s1:145-205"

"pnpm k6 <scenario> capacity --watch" runs this for you with the step windows
already filled in.`);
  process.exit(1);
};

const ROLES = { server: "server", mongodb: "mongo", redis: "redis", worker: "worker" };

const roleOf = (name) => {
  const match = /^trellify-(server|mongodb|redis|worker)-/.exec(name);
  return match === null ? undefined : ROLES[match[1]];
};

const kubectl = (args) => spawnSync("kubectl", args, { encoding: "utf8" });

const listNames = (args) => {
  const result = kubectl([...args, "-o", "jsonpath={.items[*].metadata.name}"]);
  return result.status === 0 ? result.stdout.split(/\s+/).filter(Boolean) : [];
};

const parseSteps = (spec) =>
  spec
    .split(",")
    .map((entry) => /^([^:]+):(\d+)-(\d+)$/.exec(entry.trim()))
    .filter((match) => match !== null)
    .map((match) => ({ id: match[1], from: Number(match[2]), to: Number(match[3]) }));

const podSample = (kubeNodes) => {
  const byRole = {};
  for (const node of kubeNodes) {
    const result = kubectl(["get", "--raw", `/api/v1/nodes/${node}/proxy/stats/summary`]);
    if (result.status !== 0) continue;
    let summary;
    try {
      summary = JSON.parse(result.stdout);
    } catch {
      continue;
    }
    for (const pod of summary.pods ?? []) {
      if (pod.podRef?.namespace !== NAMESPACE) continue;
      const role = roleOf(pod.podRef.name);
      if (role === undefined) continue;
      if (byRole[role] === undefined) byRole[role] = { cpu: 0, memMb: 0 };
      byRole[role].cpu += (pod.cpu?.usageNanoCores ?? 0) / 1e7;
      byRole[role].memMb += (pod.memory?.workingSetBytes ?? 0) / (1024 * 1024);
    }
  }
  return byRole;
};

const forwardServerPods = () =>
  listNames(["get", "pods", "-n", NAMESPACE, "-l", "app=trellify-server"]).map((pod, index) => {
    const port = FIRST_LOCAL_PORT + index;
    const child = spawn("kubectl", ["port-forward", "-n", NAMESPACE, `pod/${pod}`, `${port}:9464`], {
      stdio: "ignore",
    });
    return { port, child };
  });

const readMetric = (body, name) => {
  const match = new RegExp(`^${name} ([0-9.eE+-]+)$`, "m").exec(body);
  return match === null ? undefined : Number(match[1]);
};

const nodeSample = async (port) => {
  try {
    const response = await fetch(`http://localhost:${port}/metrics`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return { port, reachable: false };
    const body = await response.text();
    return {
      port,
      reachable: true,
      lagP99: readMetric(body, NODE_METRICS.lagP99),
      heapUsed: readMetric(body, NODE_METRICS.heapUsed),
      cpuSeconds: readMetric(body, NODE_METRICS.cpuSeconds),
    };
  } catch {
    return { port, reachable: false };
  }
};

const sampleOnce = async (ports, kubeNodes, startedAt) => {
  const [pods, nodes] = await Promise.all([
    Promise.resolve().then(() => podSample(kubeNodes)),
    Promise.all(ports.map(nodeSample)),
  ]);
  return { at: Date.now(), t: (Date.now() - startedAt) / 1000, pods, nodes };
};

const collectingRun = async (options) => {
  const startedAt = Date.now();
  const steps = options.steps === undefined ? [] : parseSteps(options.steps);
  const kubeNodes = listNames(["get", "nodes"]);
  const forwards = forwardServerPods();
  const ports = forwards.map((forward) => forward.port);
  writeFileSync(options.out, `${JSON.stringify({ type: "meta", startedAt, ports, steps })}\n`);

  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  if (!process.stdin.isTTY) process.stdin.on("end", stop).resume();

  console.log(
    `Watching ${forwards.length} server pods on ${kubeNodes.length} nodes every ${options.interval}s. Ctrl+C to stop.`
  );

  let index = 0;
  while (!stopping) {
    const sample = await sampleOnce(ports, kubeNodes, startedAt);
    appendFileSync(options.out, `${JSON.stringify({ type: "sample", ...sample })}\n`);
    index += 1;
    const nextAt = startedAt + index * options.interval * 1000;
    const wait = nextAt - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  }

  for (const forward of forwards) forward.child.kill();
  process.stdin.destroy();
  report(options.out);
};

const bucketsFor = (samples, steps) => {
  if (steps.length > 0) {
    return steps
      .map((step) => ({
        label: step.id,
        note: `${step.from}-${step.to}s`,
        rows: samples.filter((sample) => sample.t >= step.from && sample.t < step.to),
      }))
      .filter((bucket) => bucket.rows.length > 0);
  }
  const buckets = new Map();
  for (const sample of samples) {
    const key = Math.floor(sample.t / FALLBACK_BUCKET_SECONDS) * FALLBACK_BUCKET_SECONDS;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(sample);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, rows]) => ({ label: `${key}s`, note: `${key}-${key + FALLBACK_BUCKET_SECONDS}s`, rows }));
};

const mean = (values) => (values.length === 0 ? undefined : values.reduce((sum, v) => sum + v, 0) / values.length);
const max = (values) => (values.length === 0 ? undefined : Math.max(...values));
const defined = (values) => values.filter((value) => value !== undefined && Number.isFinite(value));

const summarise = (rows) => {
  const roleCpu = (role) => defined(rows.map((row) => (row.pods ?? row.docker)?.[role]?.cpu));
  const lags = defined(rows.flatMap((row) => row.nodes.map((node) => node.lagP99)));
  const heaps = defined(rows.flatMap((row) => row.nodes.map((node) => node.heapUsed)));
  const replicas = max(rows.map((row) => row.nodes.filter((node) => node.reachable).length));
  const serverCpu = mean(roleCpu("server"));
  return {
    serverCpu,
    cpuPerReplica: serverCpu === undefined || !replicas ? undefined : serverCpu / replicas,
    replicas,
    mongoCpu: mean(roleCpu("mongo")),
    redisCpu: mean(roleCpu("redis")),
    lagMs: max(lags) === undefined ? undefined : max(lags) * 1000,
    heapMb: max(heaps) === undefined ? undefined : max(heaps) / (1024 * 1024),
  };
};

const cell = (value, digits, width) => (value === undefined ? "-" : value.toFixed(digits)).padStart(width);

const verdict = (buckets) => {
  const scored = buckets
    .map((bucket) => ({ label: bucket.label, ...summarise(bucket.rows) }))
    .filter((bucket) => bucket.lagMs !== undefined);
  if (scored.length === 0) return ["No /metrics samples were reachable, so only the CPU columns mean anything."];

  const worst = scored.reduce((peak, bucket) => (bucket.lagMs > peak.lagMs ? bucket : peak));
  const lines = [
    `Worst event loop lag was ${worst.lagMs.toFixed(1)}ms at ${worst.label}, with server CPU ${cell(worst.serverCpu, 0, 1)}% and mongo CPU ${cell(worst.mongoCpu, 0, 1)}%.`,
  ];

  const saturated = scored.find((bucket) => bucket.cpuPerReplica >= SATURATED_REPLICA_CPU);

  if (worst.mongoCpu !== undefined && worst.serverCpu !== undefined) {
    if (worst.mongoCpu > worst.serverCpu) {
      lines.push("Mongo burned more CPU than the whole server tier: the database is the first thing to look at.");
    } else if (saturated !== undefined) {
      lines.push(
        `From ${saturated.label} on, ${saturated.replicas === 1 ? "the only server replica" : `each of the ${saturated.replicas} server replicas`} averaged ${saturated.cpuPerReplica.toFixed(0)}% CPU - ` +
          "a full core for a single-threaded Node process, so the server tier is CPU-bound and requests queue for the event loop. " +
          "More replicas, more CPU per replica, or less work per request raises the ceiling; tuning Mongo does not."
      );
    } else if (worst.lagMs > 100) {
      lines.push(
        "The event loop was blocked while Mongo stayed cheap: the bottleneck is inside Node, not the database."
      );
    } else {
      lines.push(
        "Neither the event loop nor Mongo was saturated, so the latency came from waiting - connection pools, network, or a missing index."
      );
    }
  }
  return lines;
};

const report = (file) => {
  if (!existsSync(file)) {
    console.error(`No such file: ${file}`);
    process.exit(1);
  }
  const lines = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  const parsed = lines.map((line) => JSON.parse(line));
  const meta = parsed.find((entry) => entry.type === "meta") ?? { steps: [] };
  const samples = parsed.filter((entry) => entry.type === "sample");

  if (samples.length === 0) {
    console.error(`${file} holds no samples.`);
    process.exit(1);
  }

  const buckets = bucketsFor(samples, meta.steps ?? []);
  const labelWidth = Math.max(6, ...buckets.map((bucket) => bucket.label.length));

  console.log(
    `\nServer during the run   samples: ${samples.length}   span: ${samples[samples.length - 1].t.toFixed(0)}s\n`
  );
  console.log(
    `  ${"step".padEnd(labelWidth)}  ${"window".padEnd(12)}  ${"server%".padStart(8)}  ${"mongo%".padStart(7)}  ${"redis%".padStart(7)}  ${"loop p99".padStart(9)}  ${"heap MB".padStart(8)}`
  );
  for (const bucket of buckets) {
    const row = summarise(bucket.rows);
    console.log(
      `  ${bucket.label.padEnd(labelWidth)}  ${bucket.note.padEnd(12)}  ${cell(row.serverCpu, 1, 8)}  ${cell(row.mongoCpu, 1, 7)}  ` +
        `${cell(row.redisCpu, 1, 7)}  ${cell(row.lagMs, 1, 7)}ms  ${cell(row.heapMb, 1, 8)}`
    );
  }

  console.log("");
  for (const line of verdict(buckets)) console.log(`  ${line}`);
  console.log(
    `\n  server% sums every replica, so 300% means three saturated cores. loop p99 and heap` +
      `\n  are the worst replica in that window, not the average.\n`
  );
};

const argv = process.argv.slice(2);
const valueOf = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index === -1 || index + 1 >= argv.length ? fallback : argv[index + 1];
};

if (argv.includes("--help") || argv.includes("-h")) usage();

const reportFile = valueOf("--report", undefined);
if (reportFile !== undefined) {
  report(reportFile);
} else {
  const out = valueOf("--out", undefined);
  if (out === undefined) usage();
  const interval = Number(valueOf("--interval", DEFAULT_INTERVAL));
  await collectingRun({
    out,
    interval: Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_INTERVAL,
    steps: valueOf("--steps", undefined),
  });
}

import exec from "k6/execution";

const RAMPS = {
  load: [
    { duration: "1m", target: 50 },
    { duration: "3m", target: 50 },
    { duration: "1m", target: 0 },
  ],
  stress: [
    { duration: "1m", target: 50 },
    { duration: "2m", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "2m", target: 100 },
    { duration: "1m", target: 150 },
    { duration: "2m", target: 150 },
    { duration: "1m", target: 200 },
    { duration: "2m", target: 200 },
    { duration: "1m", target: 0 },
  ],
  spike: [
    { duration: "30s", target: 10 },
    { duration: "20s", target: 200 },
    { duration: "1m", target: 200 },
    { duration: "20s", target: 10 },
    { duration: "30s", target: 0 },
  ],
};

const ARRIVAL_RATES = {
  capacity: {
    startRate: 15,
    preAllocatedVUs: 300,
    maxVUs: 1200,
    ladder: {
      warmupSeconds: 45,
      rampSeconds: 20,
      holdSeconds: 60,
      holdWarmupSeconds: 30,
      rungs: [25, 35, 50, 70, 95, 130, 175, 235, 315, 425, 570, 800],
    },
  },
};

const MIN_HOLD_SECONDS = 6;

const CONSTANTS = {
  smoke: { vus: 1, duration: "30s" },
  baseline: { vus: 3, duration: "90s" },
  soak: { vus: 20, duration: "30m" },
};

// Queueing at saturation flattens the latency differences between endpoints.
// These profiles stay far below the knee so intrinsic cost is what gets measured.
const NO_THINK_PROFILES = new Set(["baseline"]);

const peakOf = (stages) => stages.reduce((peak, stage) => Math.max(peak, stage.target), 0);

const overrideVUs = () => {
  const parsed = Number.parseInt(__ENV.VUS || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const overrideRate = () => {
  const parsed = Number.parseInt(__ENV.RATE || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const share = (total, weight) => Math.max(1, Math.round(total * weight));

const ladderScale = () => {
  const parsed = Number(__ENV.LADDER_SCALE ?? "1");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const scaledSeconds = (value, timeScale) => Math.round(value * timeScale);

const stagesOf = (config) => {
  const timeScale = ladderScale();
  const seconds = (value) => `${scaledSeconds(value, timeScale)}s`;
  const stages = [{ duration: seconds(config.ladder.warmupSeconds), target: config.startRate }];
  for (const rung of config.ladder.rungs) {
    stages.push({ duration: seconds(config.ladder.rampSeconds), target: rung });
    stages.push({ duration: seconds(config.ladder.holdSeconds), target: rung });
  }
  return stages;
};

export function profileName() {
  return __ENV.PROFILE || "load";
}

export function isOpenModel() {
  return Boolean(ARRIVAL_RATES[profileName()]);
}

const buildLadder = () => {
  const config = ARRIVAL_RATES[profileName()];
  if (!config || !config.ladder) return null;

  const { ladder } = config;
  const timeScale = ladderScale();
  const holdSeconds = scaledSeconds(ladder.holdSeconds, timeScale);
  if (holdSeconds < MIN_HOLD_SECONDS) {
    throw new Error(
      `LADDER_SCALE=${timeScale} leaves a ${holdSeconds}s hold, below the ${MIN_HOLD_SECONDS}s k6 needs to evaluate a threshold. Use at least ${MIN_HOLD_SECONDS / ladder.holdSeconds}.`
    );
  }

  const requested = overrideRate();
  const rateScale = requested ? requested / peakOf(stagesOf(config)) : 1;
  const warmMs = scaledSeconds(ladder.warmupSeconds, timeScale) * 1000;
  const rampMs = scaledSeconds(ladder.rampSeconds, timeScale) * 1000;
  const holdMs = holdSeconds * 1000;
  const rungMs = rampMs + holdMs;
  const holdWarmupMs = scaledSeconds(ladder.holdWarmupSeconds, timeScale) * 1000;

  const steps = ladder.rungs.map((rung, index) => {
    const holdStartMs = warmMs + index * rungMs + rampMs;
    return Object.freeze({
      id: `s${index}`,
      index,
      offered: Math.max(1, Math.round(rung * rateScale)),
      tag: Object.freeze({ step: `s${index}` }),
      holdStartMs,
      holdSeconds,
      abortAfterSeconds: Math.round((holdStartMs + holdWarmupMs) / 1000),
    });
  });

  return Object.freeze({
    timeScale,
    warmMs,
    rampMs,
    holdMs,
    rungMs,
    steps: Object.freeze(steps),
    warmTag: Object.freeze({ step: "warm" }),
    rampTag: Object.freeze({ step: "ramp" }),
    tailTag: Object.freeze({ step: "tail" }),
  });
};

const LADDER = buildLadder();

export function capacityLadder() {
  return LADDER;
}

export function stepTag() {
  if (LADDER === null) return undefined;
  const elapsed = exec.instance.currentTestRunDuration;
  if (elapsed < LADDER.warmMs) return LADDER.warmTag;
  const offset = elapsed - LADDER.warmMs;
  const index = Math.floor(offset / LADDER.rungMs);
  if (index >= LADDER.steps.length) return LADDER.tailTag;
  return offset % LADDER.rungMs < LADDER.rampMs ? LADDER.rampTag : LADDER.steps[index].tag;
}

// Sleeping inside an arrival-rate iteration does not slow the arrival of new
// iterations, it only pins more VUs. Force it off so maxVUs stays reachable.
export function thinkSeconds() {
  if (isOpenModel() || NO_THINK_PROFILES.has(profileName())) return 0;
  const parsed = Number(__ENV.THINK_TIME ?? "1");
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
}

const openModelScenarios = (weights) => {
  const config = ARRIVAL_RATES[profileName()];
  const stages = config.ladder ? stagesOf(config) : config.stages;
  const requested = overrideRate();
  const scale = requested ? requested / peakOf(stages) : 1;
  const scenarios = {};

  for (const [key, weight] of Object.entries(weights)) {
    scenarios[key] = {
      executor: "ramping-arrival-rate",
      startRate: share(config.startRate * scale, weight),
      timeUnit: "1s",
      preAllocatedVUs: share(config.preAllocatedVUs, weight),
      maxVUs: share(config.maxVUs, weight),
      exec: key,
      stages: stages.map((stage) => ({
        duration: stage.duration,
        target: share(stage.target * scale, weight),
      })),
      tags: { flow: key },
    };
  }
  return scenarios;
};

export function scenariosFor(weights) {
  if (isOpenModel()) return openModelScenarios(weights);

  const name = profileName();
  const requested = overrideVUs();
  const scenarios = {};

  if (RAMPS[name]) {
    const stages = RAMPS[name];
    const scale = requested ? requested / peakOf(stages) : 1;
    for (const [key, weight] of Object.entries(weights)) {
      scenarios[key] = {
        executor: "ramping-vus",
        startVUs: 0,
        gracefulRampDown: "30s",
        exec: key,
        stages: stages.map((stage) => ({
          duration: stage.duration,
          target: stage.target === 0 ? 0 : share(stage.target * scale, weight),
        })),
        tags: { flow: key },
      };
    }
    return scenarios;
  }

  const constant = CONSTANTS[name] || CONSTANTS.smoke;
  const vus = requested || constant.vus;
  for (const [key, weight] of Object.entries(weights)) {
    scenarios[key] = {
      executor: "constant-vus",
      vus: share(vus, weight),
      duration: __ENV.DURATION || constant.duration,
      exec: key,
      tags: { flow: key },
    };
  }
  return scenarios;
}

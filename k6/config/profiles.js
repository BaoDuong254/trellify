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
    startRate: 25,
    preAllocatedVUs: 100,
    maxVUs: 800,
    stages: [
      { duration: "1m", target: 50 },
      { duration: "2m", target: 50 },
      { duration: "1m", target: 100 },
      { duration: "2m", target: 100 },
      { duration: "1m", target: 200 },
      { duration: "2m", target: 200 },
      { duration: "1m", target: 300 },
      { duration: "2m", target: 300 },
      { duration: "1m", target: 400 },
      { duration: "2m", target: 400 },
    ],
  },
};

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

export function profileName() {
  return __ENV.PROFILE || "load";
}

export function isOpenModel() {
  return Boolean(ARRIVAL_RATES[profileName()]);
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
  const requested = overrideRate();
  const scale = requested ? requested / peakOf(config.stages) : 1;
  const scenarios = {};

  for (const [key, weight] of Object.entries(weights)) {
    scenarios[key] = {
      executor: "ramping-arrival-rate",
      startRate: share(config.startRate * scale, weight),
      timeUnit: "1s",
      preAllocatedVUs: share(config.preAllocatedVUs, weight),
      maxVUs: share(config.maxVUs, weight),
      exec: key,
      stages: config.stages.map((stage) => ({
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

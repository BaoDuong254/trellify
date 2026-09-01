import { capacityLadder, isOpenModel } from "./profiles.js";

const BY_GROUP = {
  read: {
    "http_req_duration{group:read}": ["p(95)<500", "p(99)<1000"],
    "http_req_duration{board_size:small}": ["p(95)<500"],
    "http_req_duration{board_size:medium}": ["p(95)<800"],
    "http_req_duration{board_size:large}": ["p(95)<1500"],
  },
  write: {
    "http_req_duration{group:write}": ["p(95)<800", "p(99)<1500"],
  },
  auth: {
    "http_req_duration{group:auth}": ["p(95)<1500", "p(99)<3000"],
  },
};

const KNEE_FAIL_RATE = 0.05;

const kneeLatencyMs = () => {
  const parsed = Number(__ENV.KNEE_P95 ?? "2000");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2000;
};

const capacityThresholds = () => {
  const ladder = capacityLadder();
  const latency = kneeLatencyMs();
  const thresholds = {
    dropped_iterations: ["count<1"],
    checks: ["rate>0.90"],
  };

  for (const step of ladder.steps) {
    const delayAbortEval = `${step.abortAfterSeconds}s`;
    thresholds[`http_req_duration{step:${step.id}}`] = [
      { threshold: `p(95)<${latency}`, abortOnFail: true, delayAbortEval },
    ];
    thresholds[`http_req_failed{step:${step.id}}`] = [
      { threshold: `rate<${KNEE_FAIL_RATE}`, abortOnFail: true, delayAbortEval },
    ];
    thresholds[`http_reqs{step:${step.id}}`] = ["count>=0"];
  }
  return thresholds;
};

export function thresholdsFor(groups) {
  if (isOpenModel()) return capacityThresholds();

  const thresholds = {
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
  };
  for (const group of groups) Object.assign(thresholds, BY_GROUP[group]);
  return thresholds;
}

import { isOpenModel } from "./profiles.js";

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

// Capacity runs hunt for the breaking point instead of guarding an SLO, so the
// bounds are deliberately loose and abort the run once the knee is reached.
const CAPACITY_THRESHOLDS = {
  http_req_failed: [{ threshold: "rate<0.05", abortOnFail: true, delayAbortEval: "30s" }],
  http_req_duration: [{ threshold: "p(95)<2000", abortOnFail: true, delayAbortEval: "30s" }],
};

export function thresholdsFor(groups) {
  if (isOpenModel()) return { ...CAPACITY_THRESHOLDS };

  const thresholds = {
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
  };
  for (const group of groups) Object.assign(thresholds, BY_GROUP[group]);
  return thresholds;
}

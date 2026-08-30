import { fail } from "k6";

import { API_URL, TEST_ID, userForVU } from "../config/env.js";
import { thresholdsFor } from "../config/thresholds.js";
import * as api from "../lib/api.js";
import { authFlow, readFlow, writeFlow } from "../lib/flows.js";
import { buildSummary } from "../lib/summary.js";

export const options = {
  tags: { testid: TEST_ID },
  scenarios: {
    smoke: { executor: "shared-iterations", vus: 1, iterations: 1, maxDuration: "2m" },
  },
  thresholds: { ...thresholdsFor(["read", "write", "auth"]), checks: ["rate==1"] },
};

export function setup() {
  const response = api.status();
  if (response.status !== 200) fail(`API not reachable at ${API_URL} (status ${response.status})`);
}

export default function () {
  const user = userForVU();
  readFlow(user);
  writeFlow(user);
  authFlow(user);
}

export function handleSummary(data) {
  return buildSummary(data);
}

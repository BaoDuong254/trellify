import { TEST_ID, userForVU } from "../config/env.js";
import { scenariosFor } from "../config/profiles.js";
import { thresholdsFor } from "../config/thresholds.js";
import { readFlow } from "../lib/flows.js";
import { buildSummary } from "../lib/summary.js";

export const options = {
  tags: { testid: TEST_ID },
  scenarios: scenariosFor({ read: 1 }),
  thresholds: thresholdsFor(["read"]),
};

export function read() {
  readFlow(userForVU());
}

export function handleSummary(data) {
  return buildSummary(data);
}

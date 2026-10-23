import { SYSTEM_TAGS, TEST_ID, userForIteration } from "../config/env.js";
import { scenariosFor } from "../config/profiles.js";
import { thresholdsFor } from "../config/thresholds.js";
import { writeFlow } from "../lib/flows.js";
import { buildSummary } from "../lib/summary.js";

export const options = {
  tags: { testid: TEST_ID },
  systemTags: SYSTEM_TAGS,
  scenarios: scenariosFor({ write: 1 }),
  thresholds: thresholdsFor(["write"]),
};

export function write() {
  writeFlow(userForIteration());
}

export function handleSummary(data) {
  return buildSummary(data);
}

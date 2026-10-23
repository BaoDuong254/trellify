import { SKIP_AUTH, SYSTEM_TAGS, TEST_ID, userForIteration, userForVU } from "../config/env.js";
import { isOpenModel, scenariosFor } from "../config/profiles.js";
import { thresholdsFor } from "../config/thresholds.js";
import { authFlow, readFlow, writeFlow } from "../lib/flows.js";
import { buildSummary } from "../lib/summary.js";

export const options = {
  tags: { testid: TEST_ID },
  systemTags: SYSTEM_TAGS,
  scenarios: scenariosFor(
    isOpenModel() || SKIP_AUTH ? { read: 0.75, write: 0.25 } : { read: 0.7, write: 0.25, auth: 0.05 }
  ),
  thresholds: thresholdsFor(["read", "write", "auth"]),
};

export function read() {
  readFlow(userForVU());
}

export function write() {
  writeFlow(userForIteration());
}

export function auth() {
  authFlow(userForVU());
}

export function handleSummary(data) {
  return buildSummary(data);
}

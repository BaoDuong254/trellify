import { SYSTEM_TAGS, TEST_ID, userForVU } from "../config/env.js";
import { scenariosFor } from "../config/profiles.js";
import { penetrationFlow } from "../lib/flows.js";
import { buildSummary } from "../lib/summary.js";

export const options = {
  tags: { testid: TEST_ID },
  systemTags: SYSTEM_TAGS,
  scenarios: scenariosFor({ penetration: 1 }),
  thresholds: {
    checks: ["rate>0.99"],
    "http_req_duration{group:penetration}": ["p(95)<200", "p(99)<500"],
  },
};

export function penetration() {
  penetrationFlow(userForVU());
}

export function handleSummary(data) {
  return buildSummary(data);
}

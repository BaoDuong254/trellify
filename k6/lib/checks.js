import { check } from "k6";

import { businessErrors } from "./metrics.js";

export function expectStatus(response, expected, name) {
  const ok = check(response, {
    [`${name} -> ${expected}`]: (res) => res.status === expected,
  });
  businessErrors.add(!ok, { endpoint: name });
  if (!ok && __ENV.VERBOSE) {
    console.error(`${name} expected ${expected}, got ${response.status}: ${response.body}`);
  }
  return ok;
}

export function jsonData(response) {
  try {
    return response.json("data");
  } catch {
    return undefined;
  }
}

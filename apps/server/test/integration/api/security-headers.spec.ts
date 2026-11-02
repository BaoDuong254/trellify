import request from "supertest";
import { describe, expect, it } from "vitest";

import { getApp } from "test/integration/helpers";

describe("security response headers", () => {
  it.each(["/api/v1/status", "/api/v1/boards", "/api/v1/does-not-exist", "/does-not-exist"])(
    "are set on %s",
    async (path) => {
      const response = await request(getApp()).get(path);

      expect(response.headers).toMatchObject({
        "content-security-policy": expect.stringContaining("frame-ancestors 'none'"),
        "cross-origin-resource-policy": "same-site",
        "permissions-policy": expect.stringContaining("geolocation=()"),
        "x-content-type-options": "nosniff",
      });
    }
  );
});

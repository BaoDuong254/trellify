import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { afterEach, describe, expect, it, vi } from "vitest";

import { turnstileMiddleware } from "src/middlewares/turnstile.middleware";

const requestWithToken = (turnstileToken?: string): ExpressRequest =>
  ({
    body: { turnstileToken },
    headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    ip: "10.0.0.1",
  }) as unknown as ExpressRequest;

const run = async (request: ExpressRequest): Promise<ReturnType<typeof vi.fn>> => {
  const next = vi.fn();
  await turnstileMiddleware.verify(request, {} as ExpressResponse, next as NextFunction);
  return next;
};

const stubSiteverify = (implementation: () => Promise<unknown>) => {
  const fetchMock = vi.fn(implementation);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("turnstileMiddleware.verify", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a request without a token with 422 and never calls Cloudflare", async () => {
    const fetchMock = stubSiteverify(async () => ({}));

    const next = await run(requestWithToken());

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: StatusCodes.UNPROCESSABLE_ENTITY }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes a verified token through and forwards the first X-Forwarded-For hop", async () => {
    const fetchMock = stubSiteverify(async () => ({ json: async () => ({ success: true }) }));

    const next = await run(requestWithToken("token"));

    expect(next).toHaveBeenCalledWith();
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({ response: "token", remoteip: "203.0.113.7" });
  });

  it("answers 403 when Cloudflare rejects the token", async () => {
    stubSiteverify(async () => ({ json: async () => ({ success: false }) }));

    const next = await run(requestWithToken("token"));

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: StatusCodes.FORBIDDEN }));
  });

  it("answers 503 when Cloudflare cannot be reached", async () => {
    stubSiteverify(async () => {
      throw new Error("network down");
    });

    const next = await run(requestWithToken("token"));

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: StatusCodes.SERVICE_UNAVAILABLE }));
  });
});

import express, { type Express } from "express";
import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SENTRY_DSN } from "@workspace/shared/constants/sentry";

import { errorHandlingMiddleware } from "src/middlewares/error-handling.middleware";
import { diagnosticsRoute } from "src/routes/v1/diagnostics.route";

const PROJECT_DSN = new URL(SENTRY_DSN);
const PROJECT_ID = PROJECT_DSN.pathname.slice(1);

const createTestApp = (): Express =>
  express().use("/api/v1/diagnostics", diagnosticsRoute).use(errorHandlingMiddleware);

const envelopeFor = (dsn: string): Buffer =>
  Buffer.concat([
    Buffer.from(`${JSON.stringify({ event_id: "0123456789abcdef0123456789abcdef", dsn })}\n`),
    Buffer.from(`${JSON.stringify({ type: "replay_recording", length: 5 })}\n`),
    Buffer.from([120, 156, 10, 0, 255]),
  ]);

const stubSentry = (implementation: () => Promise<Response>) => {
  const fetchMock = vi.fn(implementation);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const postEnvelope = (body: Buffer | string): request.Test =>
  request(createTestApp()).post("/api/v1/diagnostics").set("Content-Type", "text/plain;charset=UTF-8").send(body);

describe("POST /api/v1/diagnostics", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards the envelope byte for byte to the project's envelope endpoint", async () => {
    const fetchMock = stubSentry(async () => new Response(null, { status: StatusCodes.OK }));
    const envelope = envelopeFor(SENTRY_DSN);

    await postEnvelope(envelope).expect(StatusCodes.OK);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://${PROJECT_DSN.host}/api/${PROJECT_ID}/envelope/`);
    expect(Buffer.from(init.body as Uint8Array).equals(envelope)).toBe(true);
  });

  it("hands Sentry the viewer's IP from X-Real-IP instead of the server's own address", async () => {
    const fetchMock = stubSentry(async () => new Response(null, { status: StatusCodes.OK }));

    await postEnvelope(envelopeFor(SENTRY_DSN)).set("X-Real-IP", "203.0.113.7").expect(StatusCodes.OK);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({ "X-Forwarded-For": "203.0.113.7" });
  });

  it("falls back to the socket address when no proxy set X-Real-IP", async () => {
    const fetchMock = stubSentry(async () => new Response(null, { status: StatusCodes.OK }));

    await postEnvelope(envelopeFor(SENTRY_DSN)).expect(StatusCodes.OK);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({ "X-Forwarded-For": expect.stringContaining("127.0.0.1") });
  });

  it("relays Sentry's status and rate-limit headers so the SDK backs off", async () => {
    stubSentry(
      async () =>
        new Response(null, {
          status: StatusCodes.TOO_MANY_REQUESTS,
          headers: { "X-Sentry-Rate-Limits": "60:error:organization", "Retry-After": "60" },
        })
    );

    const response = await postEnvelope(envelopeFor(SENTRY_DSN)).expect(StatusCodes.TOO_MANY_REQUESTS);

    expect(response.headers["x-sentry-rate-limits"]).toBe("60:error:organization");
    expect(response.headers["retry-after"]).toBe("60");
  });

  it.each([
    ["another project", `https://key@${PROJECT_DSN.host}/1`],
    ["another host", `https://key@sentry.attacker.test/${PROJECT_ID}`],
    ["a dsn that is not a url", "not-a-dsn"],
  ])("refuses an envelope addressed to %s without calling Sentry", async (_label, dsn) => {
    const fetchMock = stubSentry(async () => new Response(null, { status: StatusCodes.OK }));

    await postEnvelope(envelopeFor(dsn)).expect(StatusCodes.BAD_REQUEST);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a body whose first line is not an envelope header", async () => {
    const fetchMock = stubSentry(async () => new Response(null, { status: StatusCodes.OK }));

    await postEnvelope("hello\nworld").expect(StatusCodes.BAD_REQUEST);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 502 when Sentry cannot be reached", async () => {
    stubSentry(async () => {
      throw new Error("network down");
    });

    const response = await postEnvelope(envelopeFor(SENTRY_DSN));

    expect(response.status).toBe(StatusCodes.BAD_GATEWAY);
    expect(response.body.message).toBe("Error.DiagnosticsUpstreamUnavailable");
  });
});

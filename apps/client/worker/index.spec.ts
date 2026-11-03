// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { SENTRY_DSN, SENTRY_TUNNEL_PATH } from "@workspace/shared/constants/sentry";

import wranglerConfig from "../wrangler.jsonc?raw";
import worker, { type Env } from "./index";

const TUNNEL_PATH = SENTRY_TUNNEL_PATH;

const PROJECT_DSN = new URL(SENTRY_DSN);
const PROJECT_ID = PROJECT_DSN.pathname.slice(1);
const ORIGIN = "https://trellify.test";

const assets = vi.fn(async () => new Response("asset"));
const env: Env = { ASSETS: { fetch: assets } };

const envelopeFor = (dsn: string): Uint8Array<ArrayBuffer> =>
  new Uint8Array([
    ...new TextEncoder().encode(`${JSON.stringify({ event_id: "0123456789abcdef0123456789abcdef", dsn })}\n`),
    ...new TextEncoder().encode(`${JSON.stringify({ type: "replay_recording", length: 5 })}\n`),
    120,
    156,
    10,
    0,
    255,
  ]);

const stubSentry = (implementation: () => Promise<Response>) => {
  const fetchMock = vi.fn(implementation);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const post = (body: Uint8Array<ArrayBuffer> | string, headers: Record<string, string> = {}): Promise<Response> => {
  const length = typeof body === "string" ? new TextEncoder().encode(body).byteLength : body.byteLength;
  return worker.fetch(
    new Request(`${ORIGIN}${TUNNEL_PATH}`, {
      method: "POST",
      body,
      headers: { "Content-Length": String(length), ...headers },
    }),
    env
  );
};

describe("Sentry tunnel worker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("forwards the envelope byte for byte to the project's envelope endpoint", async () => {
    const fetchMock = stubSentry(async () => new Response(null, { status: 200 }));
    const envelope = envelopeFor(SENTRY_DSN);

    const response = await post(envelope);

    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://${PROJECT_DSN.host}/api/${PROJECT_ID}/envelope/`);
    expect(init.body).toEqual(envelope);
  });

  it("hands Sentry the viewer's IP from CF-Connecting-IP", async () => {
    const fetchMock = stubSentry(async () => new Response(null, { status: 200 }));

    await post(envelopeFor(SENTRY_DSN), { "CF-Connecting-IP": "203.0.113.7" });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({ "X-Forwarded-For": "203.0.113.7" });
  });

  it("relays Sentry's status and rate-limit headers so the SDK backs off", async () => {
    stubSentry(
      async () =>
        new Response(null, {
          status: 429,
          headers: { "X-Sentry-Rate-Limits": "60:error:organization", "Retry-After": "60" },
        })
    );

    const response = await post(envelopeFor(SENTRY_DSN));

    expect(response.status).toBe(429);
    expect(response.headers.get("x-sentry-rate-limits")).toBe("60:error:organization");
    expect(response.headers.get("retry-after")).toBe("60");
  });

  it.each([
    ["another project", `https://key@${PROJECT_DSN.host}/1`],
    ["another host", `https://key@sentry.attacker.test/${PROJECT_ID}`],
    ["a dsn that is not a url", "not-a-dsn"],
  ])("refuses an envelope addressed to %s without calling Sentry", async (_label, dsn) => {
    const fetchMock = stubSentry(async () => new Response(null, { status: 200 }));

    const response = await post(envelopeFor(dsn));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a body whose first line is not an envelope header", async () => {
    const fetchMock = stubSentry(async () => new Response(null, { status: 200 }));

    const response = await post("hello\nworld");

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a declared length over the limit without reading the body", async () => {
    const fetchMock = stubSentry(async () => new Response(null, { status: 200 }));
    const body = new Uint8Array(5 * 1024 * 1024 + 1);
    const request = new Request(`${ORIGIN}${TUNNEL_PATH}`, {
      method: "POST",
      body,
      headers: { "Content-Length": String(body.byteLength) },
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(413);
    expect(request.bodyUsed).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards a body sent without Content-Length, as HTTP/2 and HTTP/3 clients may", async () => {
    const fetchMock = stubSentry(async () => new Response(null, { status: 200 }));
    const envelope = envelopeFor(SENTRY_DSN);

    const response = await worker.fetch(
      new Request(`${ORIGIN}${TUNNEL_PATH}`, { method: "POST", body: envelope }),
      env
    );

    expect(response.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.body).toEqual(envelope);
  });

  it("stops reading a body without Content-Length once it passes the limit", async () => {
    const fetchMock = stubSentry(async () => new Response(null, { status: 200 }));
    const chunkSize = 1024 * 1024;
    let chunksPulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        chunksPulled += 1;
        if (chunksPulled > 20) controller.close();
        else controller.enqueue(new Uint8Array(chunkSize));
      },
    });
    const init: RequestInit & { duplex: "half" } = { method: "POST", body: stream, duplex: "half" };

    const response = await worker.fetch(new Request(`${ORIGIN}${TUNNEL_PATH}`, init), env);

    expect(response.status).toBe(413);
    expect(chunksPulled).toBeLessThan(10);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is the only path wrangler.jsonc runs the worker for", () => {
    const runWorkerFirst = /"run_worker_first":\s*(\[[^\]]*\])/.exec(wranglerConfig)?.[1];

    expect(runWorkerFirst && JSON.parse(runWorkerFirst)).toEqual([TUNNEL_PATH]);
  });

  it("answers 502 when Sentry cannot be reached", async () => {
    stubSentry(async () => {
      throw new Error("network down");
    });

    const response = await post(envelopeFor(SENTRY_DSN));

    expect(response.status).toBe(502);
  });

  it("only accepts POST on the tunnel path", async () => {
    const response = await worker.fetch(new Request(`${ORIGIN}${TUNNEL_PATH}`), env);

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });

  it("serves every other path from the static assets", async () => {
    const request = new Request(`${ORIGIN}/boards/123`);

    const response = await worker.fetch(request, env);

    expect(assets).toHaveBeenCalledWith(request);
    expect(await response.text()).toBe("asset");
  });
});

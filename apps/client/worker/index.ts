import { SENTRY_DSN, SENTRY_TUNNEL_PATH } from "@workspace/shared/constants/sentry";

interface AssetsBinding {
  fetch: (request: Request) => Promise<Response>;
}

export interface Env {
  ASSETS: AssetsBinding;
}

const PROJECT_DSN = new URL(SENTRY_DSN);
const ENVELOPE_URL = `https://${PROJECT_DSN.host}/api${PROJECT_DSN.pathname}/envelope/`;
const MAX_ENVELOPE_BYTES = 5 * 1024 * 1024;
const FORWARD_TIMEOUT_MS = 10_000;
const RELAYED_RESPONSE_HEADERS = ["x-sentry-rate-limits", "retry-after"];
const NEWLINE = 0x0a;

const isProjectDsn = (dsn: unknown): boolean => {
  if (typeof dsn !== "string") return false;
  const candidate = URL.parse(dsn);
  return candidate?.host === PROJECT_DSN.host && candidate.pathname === PROJECT_DSN.pathname;
};

const readEnvelopeDsn = (envelope: Uint8Array): unknown => {
  const headerEnd = envelope.indexOf(NEWLINE);
  const header = envelope.subarray(0, headerEnd === -1 ? undefined : headerEnd);
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(header));
    return typeof parsed === "object" && parsed !== null && "dsn" in parsed ? parsed.dsn : undefined;
  } catch {
    return undefined;
  }
};

const readBoundedBody = async (
  body: ReadableStream<Uint8Array> | null
): Promise<Uint8Array<ArrayBuffer> | undefined> => {
  if (!body) return new Uint8Array(0);

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    total += chunk.value.byteLength;
    if (total > MAX_ENVELOPE_BYTES) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(chunk.value);
  }

  const envelope = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    envelope.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return envelope;
};

const forwardEnvelope = async (request: Request): Promise<Response> => {
  if (Number(request.headers.get("content-length")) > MAX_ENVELOPE_BYTES) {
    return new Response(null, { status: 413 });
  }

  const envelope = await readBoundedBody(request.body);
  if (!envelope) {
    return new Response(null, { status: 413 });
  }
  if (!isProjectDsn(readEnvelopeDsn(envelope))) {
    return new Response(null, { status: 400 });
  }

  const clientIp = request.headers.get("cf-connecting-ip");
  let upstream: Response;
  try {
    upstream = await fetch(ENVELOPE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        ...(clientIp && { "X-Forwarded-For": clientIp }),
      },
      body: envelope,
      signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
    });
  } catch {
    return new Response(null, { status: 502 });
  }
  await upstream.body?.cancel();

  const headers = new Headers();
  for (const name of RELAYED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  return new Response(null, { status: upstream.status, headers });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname !== SENTRY_TUNNEL_PATH) {
      return env.ASSETS.fetch(request);
    }
    if (request.method !== "POST") {
      return new Response(null, { status: 405, headers: { Allow: "POST" } });
    }
    return forwardEnvelope(request);
  },
};

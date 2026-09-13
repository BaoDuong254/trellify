import { SENTRY_DSN } from "@workspace/shared/constants/sentry";

const PROJECT_DSN = new URL(SENTRY_DSN);
const ENVELOPE_URL = `https://${PROJECT_DSN.host}/api${PROJECT_DSN.pathname}/envelope/`;
const FORWARD_TIMEOUT_MS = 10_000;
const RELAYED_RESPONSE_HEADERS = ["x-sentry-rate-limits", "retry-after"];

export interface ForwardedEnvelope {
  status: number;
  headers: Record<string, string>;
}

const isProjectDsn = (dsn: string): boolean => {
  const candidate = URL.parse(dsn);
  return candidate?.host === PROJECT_DSN.host && candidate.pathname === PROJECT_DSN.pathname;
};

const forwardEnvelope = async (envelope: Buffer): Promise<ForwardedEnvelope> => {
  const response = await fetch(ENVELOPE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-sentry-envelope" },
    body: new Uint8Array(envelope),
    signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
  });
  await response.body?.cancel();

  const headers: Record<string, string> = {};
  for (const name of RELAYED_RESPONSE_HEADERS) {
    const value = response.headers.get(name);
    if (value !== null) headers[name] = value;
  }

  return { status: response.status, headers };
};

export const SentryProvider = {
  isProjectDsn,
  forwardEnvelope,
};

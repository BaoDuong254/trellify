import { StatusCodes } from "http-status-codes";

import logger from "@workspace/shared/utils/logger";

import { type ForwardedEnvelope, SentryProvider } from "src/providers/sentry.provider";
import ApiError from "src/utils/api-error";

const readEnvelopeDsn = (envelope: Buffer): string | undefined => {
  const headerEnd = envelope.indexOf("\n");

  try {
    const header: unknown = JSON.parse(envelope.subarray(0, headerEnd === -1 ? undefined : headerEnd).toString("utf8"));
    if (typeof header === "object" && header !== null && "dsn" in header && typeof header.dsn === "string") {
      return header.dsn;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const forwardEnvelope = async (body: unknown, clientIp: string | undefined): Promise<ForwardedEnvelope> => {
  if (!Buffer.isBuffer(body)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Error.InvalidDiagnosticsEnvelope");
  }

  const dsn = readEnvelopeDsn(body);
  if (!dsn || !SentryProvider.isProjectDsn(dsn)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Error.InvalidDiagnosticsEnvelope");
  }

  try {
    return await SentryProvider.forwardEnvelope(body, clientIp);
  } catch (error) {
    logger.warn(`Diagnostics envelope not forwarded: ${error instanceof Error ? error.message : String(error)}`);
    throw new ApiError(StatusCodes.BAD_GATEWAY, "Error.DiagnosticsUpstreamUnavailable");
  }
};

export const diagnosticsService = {
  forwardEnvelope,
};

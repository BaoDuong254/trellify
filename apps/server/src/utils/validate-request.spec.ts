import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import ApiError from "src/utils/api-error";
import { validateRequest } from "src/utils/validate-request";

const middleware = validateRequest({
  params: z.object({ id: z.string().regex(/^[0-9a-f]{24}$/) }),
  body: z.object({ title: z.string().min(3) }),
});

const run = async (request: Partial<ExpressRequest>): Promise<ReturnType<typeof vi.fn>> => {
  const next = vi.fn();
  await middleware(request as ExpressRequest, {} as ExpressResponse, next as NextFunction);
  return next;
};

const errorPassedTo = (next: ReturnType<typeof vi.fn>): ApiError => next.mock.calls[0]?.[0] as ApiError;

describe("validateRequest", () => {
  it("calls next without an error when params and body are valid", async () => {
    const next = await run({ params: { id: "65f1a2b3c4d5e6f7a8b9c0d1" }, body: { title: "Valid" } });

    expect(next).toHaveBeenCalledWith();
  });

  it("replaces the body with the parsed value so fields outside the schema never reach the controller", async () => {
    const request: Partial<ExpressRequest> = {
      params: { id: "65f1a2b3c4d5e6f7a8b9c0d1" },
      body: { title: "Valid", ownerIds: ["attacker"], _destroy: true },
    };

    await run(request);

    expect(request.body).toEqual({ title: "Valid" });
  });

  it("maps a validation failure to 422", async () => {
    const next = await run({ params: { id: "65f1a2b3c4d5e6f7a8b9c0d1" }, body: { title: "x" } });

    expect(errorPassedTo(next)).toBeInstanceOf(ApiError);
    expect(errorPassedTo(next).statusCode).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
  });

  it("checks params before body", async () => {
    const next = await run({ params: { id: "bad" }, body: { title: "x" } });

    const message = errorPassedTo(next).message;
    expect(message).toContain('"id"');
    expect(message).not.toContain('"title"');
  });
});

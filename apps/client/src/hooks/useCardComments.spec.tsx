import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http as mock } from "msw";
import { describe, expect, it } from "vitest";

import { useCardComments } from "src/hooks/useCardComments";
import { apiUrl, server } from "src/test/server";

const comment = (content: string) => ({
  _id: content,
  userId: "user-1",
  userEmail: "a@trellify.test",
  userAvatar: null,
  userDisplayName: "A",
  content,
  commentedAt: new Date("2026-01-10T12:00:00.000Z"),
});

describe("useCardComments", () => {
  it("loads comments and reloads only when the card version changes", async () => {
    let requests = 0;
    server.use(
      mock.get(apiUrl("/api/v1/cards/card-1/comments"), () => {
        requests++;
        return HttpResponse.json({ data: [comment(`c${requests}`)] });
      })
    );

    const { result, rerender } = renderHook(({ version }) => useCardComments("card-1", version), {
      initialProps: { version: "v1" },
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.comments.map((item) => item.content)).toEqual(["c1"]));

    rerender({ version: "v1" });
    rerender({ version: "v2" });
    await waitFor(() => expect(result.current.comments.map((item) => item.content)).toEqual(["c2"]));
    expect(result.current.isLoading).toBe(false);
    expect(requests).toBe(2);
  });

  it("does not let a slower in-flight load overwrite comments replaced after a mutation", async () => {
    let releaseSlowLoad: () => void = () => {};
    server.use(
      mock.get(apiUrl("/api/v1/cards/card-1/comments"), async () => {
        await new Promise<void>((resolve) => {
          releaseSlowLoad = resolve;
        });
        return HttpResponse.json({ data: [comment("stale")] });
      })
    );

    const { result } = renderHook(() => useCardComments("card-1", "v1"));
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    act(() => result.current.replaceComments("card-1", [comment("fresh")]));
    releaseSlowLoad();

    await waitFor(() => expect(result.current.comments.map((item) => item.content)).toEqual(["fresh"]));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.comments.map((item) => item.content)).toEqual(["fresh"]);
  });
});

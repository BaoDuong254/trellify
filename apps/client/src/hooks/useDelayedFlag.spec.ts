import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDelayedFlag } from "src/hooks/useDelayedFlag";

describe("useDelayedFlag", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("turns on only after the delay and off as soon as the flag drops", () => {
    const { result, rerender } = renderHook(({ isActive }) => useDelayedFlag(isActive, 300), {
      initialProps: { isActive: true },
    });

    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);

    rerender({ isActive: false });
    expect(result.current).toBe(false);
  });

  it("never turns on when the flag drops before the delay", () => {
    const { result, rerender } = renderHook(({ isActive }) => useDelayedFlag(isActive, 300), {
      initialProps: { isActive: true },
    });

    act(() => vi.advanceTimersByTime(200));
    rerender({ isActive: false });
    act(() => vi.advanceTimersByTime(500));

    expect(result.current).toBe(false);
  });
});

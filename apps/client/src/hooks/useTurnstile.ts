import type { TurnstileInstance } from "@marsidev/react-turnstile";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

const TOKEN_WAIT_TIMEOUT_MS = 20000;
const INTERACTIVE_TOKEN_WAIT_TIMEOUT_MS = 90000;

export interface TurnstileWidgetProps {
  ref: RefObject<TurnstileInstance | undefined>;
  onSuccess: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
  onTimeout: () => void;
  onBeforeInteractive: () => void;
}

interface TokenWaiter {
  resolve: (token: string | null) => void;
  timeoutId: number;
}

interface UseTurnstileResult {
  reset: () => void;
  ensureToken: (toastId: string | number) => Promise<string | null>;
  widgetProps: TurnstileWidgetProps;
}

export const useTurnstile = (): UseTurnstileResult => {
  const widgetRef = useRef<TurnstileInstance | undefined>(undefined);
  const tokenRef = useRef<string | null>(null);
  const waitersRef = useRef<TokenWaiter[]>([]);

  const setToken = useCallback((token: string): void => {
    tokenRef.current = token;

    const waiters = waitersRef.current;
    waitersRef.current = [];
    waiters.forEach((waiter) => {
      window.clearTimeout(waiter.timeoutId);
      waiter.resolve(token);
    });
  }, []);

  const clearToken = useCallback((): void => {
    tokenRef.current = null;
  }, []);

  const reset = useCallback((): void => {
    tokenRef.current = null;
    widgetRef.current?.reset();
  }, []);

  const startDeadline = useCallback((resolve: (token: string | null) => void, durationMs: number): number => {
    const timeoutId = window.setTimeout(() => {
      waitersRef.current = waitersRef.current.filter((waiter) => waiter.timeoutId !== timeoutId);
      resolve(null);
    }, durationMs);

    return timeoutId;
  }, []);

  const ensureToken = useCallback(
    async (toastId: string | number): Promise<string | null> => {
      if (tokenRef.current) return tokenRef.current;

      const token = await new Promise<string | null>((resolve) => {
        waitersRef.current.push({ resolve, timeoutId: startDeadline(resolve, TOKEN_WAIT_TIMEOUT_MS) });
      });

      if (!token) {
        toast.error("Could not verify you are human. Please try again.", { id: toastId });
        reset();
      }

      return token;
    },
    [reset, startDeadline]
  );

  const beginInteractive = useCallback((): void => {
    waitersRef.current = waitersRef.current.map((waiter) => {
      window.clearTimeout(waiter.timeoutId);
      return { ...waiter, timeoutId: startDeadline(waiter.resolve, INTERACTIVE_TOKEN_WAIT_TIMEOUT_MS) };
    });
  }, [startDeadline]);

  useEffect(() => {
    return () => {
      waitersRef.current.forEach((waiter) => window.clearTimeout(waiter.timeoutId));
      waitersRef.current = [];
    };
  }, []);

  return {
    reset,
    ensureToken,
    widgetProps: {
      ref: widgetRef,
      onSuccess: setToken,
      onExpire: clearToken,
      onError: clearToken,
      onTimeout: reset,
      onBeforeInteractive: beginInteractive,
    },
  };
};

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const PREFILL_POLL_INTERVAL_MS = 150;
const PREFILL_POLL_DURATION_MS = 5000;
const TOKEN_WAIT_TIMEOUT_MS = 20000;
const INTERACTIVE_TOKEN_WAIT_TIMEOUT_MS = 90000;

interface TurnstileFormProps {
  ref: RefObject<HTMLFormElement | null>;
  onFocusCapture: () => void;
  onPointerDown: () => void;
  onInput: () => void;
}

export interface TurnstileWidgetProps {
  ref: RefObject<TurnstileInstance | undefined>;
  active: boolean;
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
  ensureToken: () => Promise<string | null>;
  formProps: TurnstileFormProps;
  widgetProps: TurnstileWidgetProps;
}

export const useTurnstile = (): UseTurnstileResult => {
  const formRef = useRef<HTMLFormElement | null>(null);
  const widgetRef = useRef<TurnstileInstance | undefined>(undefined);
  const tokenRef = useRef<string | null>(null);
  const waitersRef = useRef<TokenWaiter[]>([]);
  const [armed, setArmed] = useState(false);

  const arm = useCallback((): void => setArmed(true), []);

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

  const ensureToken = useCallback(async (): Promise<string | null> => {
    if (tokenRef.current) return tokenRef.current;

    setArmed(true);

    const token = await new Promise<string | null>((resolve) => {
      waitersRef.current.push({ resolve, timeoutId: startDeadline(resolve, TOKEN_WAIT_TIMEOUT_MS) });
    });

    if (!token) {
      toast.error("Could not verify you are human. Please try again.");
      reset();
    }

    return token;
  }, [reset, startDeadline]);

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

  useEffect(() => {
    if (armed) return;

    const armWhenPrefilled = (): void => {
      const inputs = Array.from(formRef.current?.querySelectorAll("input") ?? []);
      if (inputs.some((input) => input.value !== "")) setArmed(true);
    };

    const pollId = window.setInterval(armWhenPrefilled, PREFILL_POLL_INTERVAL_MS);
    const stopPollId = window.setTimeout(() => window.clearInterval(pollId), PREFILL_POLL_DURATION_MS);

    return () => {
      window.clearInterval(pollId);
      window.clearTimeout(stopPollId);
    };
  }, [armed]);

  return {
    reset,
    ensureToken,
    formProps: {
      ref: formRef,
      onFocusCapture: arm,
      onPointerDown: arm,
      onInput: arm,
    },
    widgetProps: {
      ref: widgetRef,
      active: armed,
      onSuccess: setToken,
      onExpire: clearToken,
      onError: clearToken,
      onTimeout: reset,
      onBeforeInteractive: beginInteractive,
    },
  };
};

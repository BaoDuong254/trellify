import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const PREFILL_POLL_INTERVAL_MS = 150;
const PREFILL_POLL_DURATION_MS = 5000;

interface TurnstileFormProps {
  ref: RefObject<HTMLFormElement | null>;
  onFocusCapture: () => void;
  onPointerDown: () => void;
  onPointerEnter: () => void;
  onInput: () => void;
}

interface UseTurnstileResult {
  token: string | null;
  widgetKey: number;
  armed: boolean;
  setToken: (token: string) => void;
  clearToken: () => void;
  reset: () => void;
  formProps: TurnstileFormProps;
}

export const useTurnstile = (): UseTurnstileResult => {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);
  const [armed, setArmed] = useState(false);

  const arm = useCallback((): void => setArmed(true), []);
  const clearToken = useCallback((): void => setToken(null), []);
  const reset = useCallback((): void => {
    setWidgetKey((key) => key + 1);
    setToken(null);
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
    token,
    widgetKey,
    armed,
    setToken,
    clearToken,
    reset,
    formProps: {
      ref: formRef,
      onFocusCapture: arm,
      onPointerDown: arm,
      onPointerEnter: arm,
      onInput: arm,
    },
  };
};

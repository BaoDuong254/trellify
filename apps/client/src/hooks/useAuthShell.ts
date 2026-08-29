import { useEffect } from "react";

const AUTH_SHELL_CLASS = "auth-shell";

export const useAuthShell = (): void => {
  useEffect(() => {
    document.documentElement.classList.add(AUTH_SHELL_CLASS);
    return () => {
      document.documentElement.classList.remove(AUTH_SHELL_CLASS);
    };
  }, []);
};

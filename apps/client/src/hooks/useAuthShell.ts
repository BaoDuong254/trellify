import { useEffect } from "react";

const AUTH_SHELL_CLASS = "auth-shell";
const APP_READY_CLASS = "app-ready";

export const useAuthShell = (): void => {
  useEffect(() => {
    document.documentElement.classList.add(AUTH_SHELL_CLASS, APP_READY_CLASS);
    return () => {
      document.documentElement.classList.remove(AUTH_SHELL_CLASS);
    };
  }, []);
};

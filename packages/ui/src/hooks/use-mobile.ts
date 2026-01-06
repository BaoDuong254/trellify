/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
import * as React from "react";

const DEFAULT_MOBILE_BREAKPOINT = 768;

interface UseIsMobileProps {
  breakpoint?: number;
}

export function useIsMobile({ breakpoint = DEFAULT_MOBILE_BREAKPOINT }: UseIsMobileProps = {}) {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${String(breakpoint - 1)}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    mql.addEventListener("change", onChange);
    onChange();
    return () => {
      mql.removeEventListener("change", onChange);
    };
  }, [breakpoint]);

  return !!isMobile;
}

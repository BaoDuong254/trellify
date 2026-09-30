import { useEffect, useState } from "react";

export const useDelayedFlag = (isActive: boolean, delayMs = 300): boolean => {
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    const timer = setTimeout(() => setIsShown(true), delayMs);
    return () => {
      clearTimeout(timer);
      setIsShown(false);
    };
  }, [isActive, delayMs]);

  return isActive && isShown;
};

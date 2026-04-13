import { useCallback, useState } from "react";

const STORAGE_KEY = "valubrix_usage_count";
const LIMIT = 3;

export function useGuestLimit() {
  const [isLimitReached, setIsLimitReached] = useState(false);

  const checkUsage = useCallback(() => {
    const current = Number.parseInt(
      localStorage.getItem(STORAGE_KEY) || "0",
      10,
    );
    const next = current + 1;
    localStorage.setItem(STORAGE_KEY, String(next));
    if (next > LIMIT) {
      setIsLimitReached(true);
      return true;
    }
    return false;
  }, []);

  const dismissLimit = useCallback(() => setIsLimitReached(false), []);

  return { checkUsage, isLimitReached, dismissLimit };
}

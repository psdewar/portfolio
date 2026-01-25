import { useState, useEffect } from "react";

/**
 * Hook to detect when React hydration is complete.
 * Returns false during SSR and initial client render, true after hydration.
 *
 * Usage: Use to prevent user interaction with elements that aren't yet functional.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}

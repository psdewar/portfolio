import { useState, useEffect } from "react";
import { useDevTools } from "../contexts/DevToolsContext";
import { onPatronStatusChange } from "../lib/patron";
import type { PatronTierName } from "../data/patron-config";

const TIER_NAMES: PatronTierName[] = ["Pen", "Flow", "Mind", "Soul"];

export function usePatronStatus() {
  const { simulatePatron } = useDevTools();
  const [isPatron, setIsPatron] = useState(false);

  useEffect(() => {
    const read = () => setIsPatron(localStorage.getItem("patronStatus") === "active" || simulatePatron);
    read();
    return onPatronStatusChange(read);
  }, [simulatePatron]);

  return isPatron;
}

export function usePatronTier(): PatronTierName | null {
  const { simulatePatron } = useDevTools();
  const [tier, setTier] = useState<PatronTierName | null>(null);

  useEffect(() => {
    const read = () => {
      const stored = localStorage.getItem("patronTier");
      const valid = TIER_NAMES.find((name) => name === stored) ?? null;
      setTier(valid ?? (simulatePatron ? "Pen" : null));
    };
    read();
    return onPatronStatusChange(read);
  }, [simulatePatron]);

  return tier;
}

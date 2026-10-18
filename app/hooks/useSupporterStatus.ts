import { useState, useEffect } from "react";
import { useDevTools } from "../contexts/DevToolsContext";
import { onSupporterStatusChange } from "../lib/supporter";
import type { SupporterTierName } from "../data/supporter-config";

const TIER_NAMES: SupporterTierName[] = ["Pen", "Flow", "Mind", "Soul"];

export function useSupporterStatus() {
  const { simulateSupporter } = useDevTools();
  const [isSupporter, setIsSupporter] = useState(false);

  useEffect(() => {
    const read = () => setIsSupporter(localStorage.getItem("supporterStatus") === "active" || simulateSupporter);
    read();
    return onSupporterStatusChange(read);
  }, [simulateSupporter]);

  return isSupporter;
}

export function useSupporterTier(): SupporterTierName | null {
  const { simulateSupporter } = useDevTools();
  const [tier, setTier] = useState<SupporterTierName | null>(null);

  useEffect(() => {
    const read = () => {
      const stored = localStorage.getItem("supporterTier");
      const valid = TIER_NAMES.find((name) => name === stored) ?? null;
      setTier(valid ?? (simulateSupporter ? "Pen" : null));
    };
    read();
    return onSupporterStatusChange(read);
  }, [simulateSupporter]);

  return tier;
}

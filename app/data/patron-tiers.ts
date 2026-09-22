import { PencilIcon, WavesIcon, LightbulbIcon, FireIcon, type Icon } from "@phosphor-icons/react";
import { PATRON_TIER_BASE, type PatronTierName } from "./patron-config";

const TIER_ICONS: Record<PatronTierName, Icon> = {
  Pen: PencilIcon,
  Flow: WavesIcon,
  Mind: LightbulbIcon,
  Soul: FireIcon,
};

const TIER_HINTS: Record<PatronTierName, { monthly: string; annually: string }> = {
  Pen: { monthly: "pays for one gallon of gas", annually: "pays for one day of meals" },
  Flow: { monthly: "pays for lunch", annually: "pays for one overnight stay" },
  Mind: { monthly: "pays for one day car rental", annually: "pays for one round-trip flight" },
  Soul: { monthly: "Name your price", annually: "Name your price" },
};

export const PATRON_TIERS = PATRON_TIER_BASE.map((tier) => ({
  ...tier,
  icon: TIER_ICONS[tier.name],
  hint: TIER_HINTS[tier.name],
}));

export type { PatronTierName };

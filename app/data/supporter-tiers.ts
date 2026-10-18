import { PencilIcon, WavesIcon, LightbulbIcon, FireIcon, type Icon } from "@phosphor-icons/react";
import { SUPPORTER_TIER_BASE, type SupporterTierName } from "./supporter-config";

const TIER_ICONS: Record<SupporterTierName, Icon> = {
  Pen: PencilIcon,
  Flow: WavesIcon,
  Mind: LightbulbIcon,
  Soul: FireIcon,
};

const TIER_HINTS: Record<SupporterTierName, { monthly: string; annually: string }> = {
  Pen: { monthly: "pays for two gallons of gas", annually: "pays to fly my gear" },
  Flow: { monthly: "pays for lunch on the road", annually: "pays for an overnight stay" },
  Mind: { monthly: "pays for a day's car rental", annually: "pays for a round-trip flight" },
  Soul: { monthly: "Name your price", annually: "Name your price" },
};

export const SUPPORTER_TIERS = SUPPORTER_TIER_BASE.map((tier) => ({
  ...tier,
  icon: TIER_ICONS[tier.name],
  hint: TIER_HINTS[tier.name],
}));

export type { SupporterTierName };

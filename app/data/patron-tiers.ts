import { PencilIcon, WavesIcon, LightbulbIcon, FireIcon, type Icon } from "@phosphor-icons/react";
import { PATRON_TIER_BASE, type PatronTierName } from "./patron-config";

const TIER_ICONS: Record<PatronTierName, Icon> = {
  Pen: PencilIcon,
  Flow: WavesIcon,
  Mind: LightbulbIcon,
  Soul: FireIcon,
};

export const PATRON_TIERS = PATRON_TIER_BASE.map((tier) => ({
  ...tier,
  icon: TIER_ICONS[tier.name],
}));

export type { PatronTierName };

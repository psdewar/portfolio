import type { SocialKind } from "../../lib/social-destinations";

export type Platform = "youtube" | "instagram" | "facebook";

export const createdAs = (privacy: string) =>
  `Created automatically as ${privacy.charAt(0).toUpperCase()}${privacy.slice(1)}.`;

export const MANUAL_STEPS: Record<Platform, Record<SocialKind, string>> = {
  youtube: { public: createdAs("public"), practice: createdAs("private") },
  instagram: {
    public: "Choose Public in Live Producer before copying the key.",
    practice: "Choose Practice in Live Producer before copying the key.",
  },
  facebook: {
    public: "Check the audience is Public before Go Live.",
    practice: "Set the audience to Only me in Live Producer.",
  },
};

export const FACEBOOK_AUTO_STEPS: Record<SocialKind, string> = {
  public: createdAs("public"),
  practice: createdAs("Only me"),
};

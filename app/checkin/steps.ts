export const CHECKIN_STEPS = ["save", "tee", "support", "upload", "monthly", "follow"] as const;

export type CheckinStep = (typeof CHECKIN_STEPS)[number];

import { grossUpCents } from "./fees";
import { postJsonField } from "./network-error";

export const createContributionSecret = (cents: number, checkinId?: string | null) =>
  postJsonField(
    "/api/contribution-checkout",
    {
      items: [{ key: "support", amountCents: grossUpCents(cents) }],
      trip: "tour",
      feeIncluded: true,
      ...(checkinId ? { checkinId } : {}),
    },
    "clientSecret",
  );

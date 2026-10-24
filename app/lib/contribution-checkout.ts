import { grossUpCents } from "./fees";
import { postJson } from "./network-error";

export async function createContributionSecret(cents: number, checkinId?: string | null) {
  const res = await postJson("/api/contribution-checkout", {
    items: [{ key: "support", amountCents: grossUpCents(cents) }],
    trip: "tour",
    feeIncluded: true,
    ...(checkinId ? { checkinId } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.clientSecret) throw new Error(data.error);
  return data.clientSecret as string;
}

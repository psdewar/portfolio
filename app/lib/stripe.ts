// Stripe processing fee: 2.9% + $0.30
// Formula to net X: charge = (X + 0.30) / 0.971

// Calculate what to charge so artist NETS a specific amount
export const calculateChargeForNet = (netAmountDollars: number) => {
  const chargeAmount = Math.ceil(((netAmountDollars + 0.3) / 0.971) * 100) / 100;
  const fee = Math.round((chargeAmount - netAmountDollars) * 100) / 100;
  return {
    net: netAmountDollars,
    charge: chargeAmount,
    chargeCents: Math.round(chargeAmount * 100),
    fee,
  };
};

// Legacy: Calculate fee added to base amount (for tips where user covers fee)
export const calculateStripeFee = (baseAmount: number) => {
  const totalWithFees = Math.ceil(((baseAmount + 0.3) / 0.971) * 100) / 100;
  const fee = Math.round((totalWithFees - baseAmount) * 100) / 100;
  return { total: totalWithFees, fee };
};

// Subscription tiers - prices that NET even amounts after Stripe fees
export const SUBSCRIPTION_TIERS = [
  { net: 10, label: "Supporter", description: "Buy me a coffee each month" },
  { net: 25, label: "Fan", description: "Cover a practice session" },
  { net: 50, label: "Patron", description: "Fund a recording hour" },
  { net: 100, label: "Champion", description: "Sponsor content creation" },
  { net: 250, label: "Inner Circle", description: "Exclusive access & updates" },
  { net: 500, label: "Executive Producer", description: "Shape the next project" },
  { net: 1000, label: "Founding Member", description: "Legacy supporter status" },
].map((tier) => ({
  ...tier,
  ...calculateChargeForNet(tier.net),
}));

export const STRIPE_CONFIG = {
  minimumAmount: 99,
  currency: "usd",
  suggestedAmounts: [
    { amount: 199, tier: "Standard" },
    { amount: 499, tier: "Supporter" },
    { amount: 999, tier: "Fan" },
    { amount: 1999, tier: "Super Fan" },
  ],
};

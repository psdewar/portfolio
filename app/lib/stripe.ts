// Stripe processing fee: 2.9% + $0.30
// Formula to net X: charge = (X + 0.30) / 0.971

// Legacy: Calculate fee added to base amount (for tips where user covers fee)
export const calculateStripeFee = (baseAmount: number) => {
  const totalWithFees = Math.ceil(((baseAmount + 0.3) / 0.971) * 100) / 100;
  const fee = Math.round((totalWithFees - baseAmount) * 100) / 100;
  return { total: totalWithFees, fee };
};

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

// Stripe processing fee calculation (2.9% + $0.30)
export const calculateStripeFee = (baseAmount: number) => {
  const totalWithFees = Math.ceil(((baseAmount + 0.3) / 0.971) * 100) / 100;
  const fee = Math.round((totalWithFees - baseAmount) * 100) / 100;
  return { total: totalWithFees, fee };
};

export const STRIPE_CONFIG = {
  suggestedAmounts: [
    { amount: 99, tier: "This Slaps" },
    { amount: 299, tier: "Run It Back" },
    { amount: 499, tier: "Stuck In My Head" },
    { amount: 999, tier: "Encore" },
  ],
  minimumAmount: 99,
  currency: "usd",
};

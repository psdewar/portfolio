export function stripeFeeCents(grossCents: number): number {
  return Math.round((grossCents * 29 + 30000) / 1000);
}

export function grossUpCents(netCents: number): number {
  const gross = Math.ceil((netCents + 30) / 0.971);
  return gross - 1 - stripeFeeCents(gross - 1) >= netCents ? gross - 1 : gross;
}

export function feeCents(netCents: number): number {
  return grossUpCents(netCents) - netCents;
}

export const MAX_CARD_CENTS = 1_000_000;
export const MAX_CARD_GROSS_CENTS = grossUpCents(MAX_CARD_CENTS);

export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatFee(cents: number): string {
  return `+$${(cents / 100).toFixed(2)} card fee`;
}

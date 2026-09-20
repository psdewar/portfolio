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

export function formatFee(cents: number): string {
  return `+$${(cents / 100).toFixed(2)} fee`;
}

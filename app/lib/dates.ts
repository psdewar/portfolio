/**
 * Format an ISO date string for "Next Live" display
 * Example output: "SAT JAN 25 · 3PM PT"
 */
export function formatNextStream(iso: string): string {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions = { timeZone: "America/Los_Angeles" };
  const day = date.toLocaleDateString("en-US", { ...options, weekday: "short" }).toUpperCase();
  const month = date.toLocaleDateString("en-US", { ...options, month: "short" }).toUpperCase();
  const dayNum = parseInt(date.toLocaleDateString("en-US", { ...options, day: "numeric" }), 10);
  const hour = parseInt(date.toLocaleString("en-US", { ...options, hour: "numeric", hour12: false }), 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${day} ${month} ${dayNum} · ${hour12}${ampm} PT`;
}

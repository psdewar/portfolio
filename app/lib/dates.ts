export function parseLocalDate(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

export function formatEventDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatEventDateShort(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatMonthDay(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

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

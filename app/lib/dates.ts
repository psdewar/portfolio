export function parseLocalDate(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

// A door time ("7PM", "2:30 pm", "19:00") as 24-hour parts. Unparseable falls back to 7PM.
export function parseDoorTime(t?: string | null): { h: number; m: number } {
  const match = (t || "").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return { h: 19, m: 0 };
  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const ap = match[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return { h, m };
}

export function doorTimeMinutes(t?: string | null): number {
  const { h, m } = parseDoorTime(t);
  return h * 60 + m;
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

export function formatDayMonthDay(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatLongDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function isDatePast(iso: string): boolean {
  return new Date(iso + "T23:59:59") <= new Date();
}

export function formatCombinedDates(dates: string[]): string {
  if (dates.length === 0) return "";
  const parsed = dates
    .map((d) => parseLocalDate(d))
    .sort((a, b) => a.getTime() - b.getTime());
  const short = (d: Date) => d.toLocaleString("en-US", { weekday: "short" });
  const month = (d: Date) => d.toLocaleString("en-US", { month: "long" });
  const long = (d: Date) => d.toLocaleString("en-US", { weekday: "long" });
  const sameMonth = parsed.every(
    (d) => d.getMonth() === parsed[0].getMonth() && d.getFullYear() === parsed[0].getFullYear(),
  );
  const sameYear = parsed.every((d) => d.getFullYear() === parsed[0].getFullYear());
  const includeWeekdays = parsed.length <= 3;

  if (parsed.length === 1) {
    return `${long(parsed[0])}, ${month(parsed[0])} ${parsed[0].getDate()}, ${parsed[0].getFullYear()}`;
  }
  if (sameMonth && includeWeekdays) {
    const dayPairs = parsed.map((d) => `${short(d)} ${d.getDate()}`).join(" · ");
    return `${dayPairs} · ${month(parsed[0])} ${parsed[0].getFullYear()}`;
  }
  if (sameMonth) {
    return `${month(parsed[0])} ${parsed.map((d) => d.getDate()).join(", ")}, ${parsed[0].getFullYear()}`;
  }
  if (sameYear && includeWeekdays) {
    const parts = parsed.map((d) => `${short(d)}, ${month(d)} ${d.getDate()}`);
    return `${parts.join(" & ")}, ${parsed[0].getFullYear()}`;
  }
  if (sameYear) {
    return `${parsed.map((d) => `${month(d)} ${d.getDate()}`).join(", ")}, ${parsed[0].getFullYear()}`;
  }
  return parsed
    .map(
      (d) =>
        `${includeWeekdays ? short(d) + ", " : ""}${month(d)} ${d.getDate()}, ${d.getFullYear()}`,
    )
    .join(" & ");
}

export function formatNextStream(iso: string): string {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions = { timeZone: "America/Los_Angeles" };
  const day = date.toLocaleDateString("en-US", { ...options, weekday: "short" }).toUpperCase();
  const month = date.toLocaleDateString("en-US", { ...options, month: "short" }).toUpperCase();
  const dayNum = parseInt(date.toLocaleDateString("en-US", { ...options, day: "numeric" }), 10);
  const hour = parseInt(
    date.toLocaleString("en-US", { ...options, hour: "numeric", hour12: false }),
    10,
  );
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${day} ${month} ${dayNum} · ${hour12}${ampm} PT`;
}

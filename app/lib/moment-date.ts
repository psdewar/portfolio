const MOMENT_TZ = "America/New_York";

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: MOMENT_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function momentDate(m: {
  city?: string | null;
  show?: string | null;
  offConcert?: boolean | null;
  visit?: string | null;
  shot?: number | null;
}): string | undefined {
  if (m.city && m.show && !m.offConcert) return m.show;
  if (m.city && m.shot) return dayFormat.format(m.shot);
  return m.visit ?? undefined;
}

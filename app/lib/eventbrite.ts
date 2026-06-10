import { Show } from "./shows";

const API = "https://www.eventbriteapi.com/v3";
const TOKEN = process.env.EVENTBRITE_TOKEN;
const TEMPLATE_EVENT_ID = process.env.EVENTBRITE_TEMPLATE_EVENT_ID || "1988986651617";
const ORG_ID = process.env.EVENTBRITE_ORG_ID || "2580670542961";

// Same env the show/sponsor routes use (SHOWS_API/SHOWS_TOKEN there) — not new vars.
const SHOWS_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";
const SHOWS_TOKEN = process.env.SCHEDULE_API_TOKEN;

const REGION_TZ: Record<string, string> = {
  // Pacific
  WA: "America/Los_Angeles", OR: "America/Los_Angeles", CA: "America/Los_Angeles", NV: "America/Los_Angeles",
  BC: "America/Vancouver",
  // Mountain
  CO: "America/Denver", NM: "America/Denver", UT: "America/Denver", WY: "America/Denver", MT: "America/Denver", ID: "America/Denver",
  AZ: "America/Phoenix", AB: "America/Edmonton",
  // Central
  TX: "America/Chicago", IL: "America/Chicago", WI: "America/Chicago", MN: "America/Chicago", IA: "America/Chicago",
  MO: "America/Chicago", AR: "America/Chicago", LA: "America/Chicago", MS: "America/Chicago", AL: "America/Chicago",
  TN: "America/Chicago", OK: "America/Chicago", KS: "America/Chicago", NE: "America/Chicago", SD: "America/Chicago",
  ND: "America/Chicago", MB: "America/Winnipeg",
  // Eastern
  NY: "America/New_York", NJ: "America/New_York", PA: "America/New_York", CT: "America/New_York", MA: "America/New_York",
  RI: "America/New_York", NH: "America/New_York", VT: "America/New_York", ME: "America/New_York", MD: "America/New_York",
  DC: "America/New_York", DE: "America/New_York", VA: "America/New_York", WV: "America/New_York", NC: "America/New_York",
  SC: "America/New_York", GA: "America/New_York", FL: "America/New_York", OH: "America/New_York", MI: "America/New_York",
  IN: "America/New_York", KY: "America/New_York", ON: "America/Toronto", QC: "America/Toronto",
};

function timezoneForRegion(region?: string): string {
  return REGION_TZ[(region || "").toUpperCase()] || "America/Los_Angeles";
}

function parseDoorTime(t?: string | null): { h: number; m: number } {
  const match = (t || "").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return { h: 19, m: 0 };
  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const ap = match[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return { h, m };
}

function tzOffsetMs(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(at)) {
    if (part.type !== "literal") p[part.type] = parseInt(part.value, 10);
  }
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - at.getTime();
}

function wallTimeToUtcIso(date: string, h: number, m: number, timeZone: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, m, 0);
  const corrected = new Date(guess - tzOffsetMs(timeZone, new Date(guess)));
  return corrected.toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function eb(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Eventbrite ${path} ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

const DONATION_NAME = "Help fund my tour across North America";

async function ensureTickets(eventId: string) {
  const existing = await eb(`/events/${eventId}/ticket_classes/`);
  const list: Array<{ id: string; free?: boolean; donation?: boolean }> = existing.ticket_classes || [];

  if (!list.some((t) => t.free && !t.donation)) {
    await eb(`/events/${eventId}/ticket_classes/`, {
      method: "POST",
      body: JSON.stringify({
        ticket_class: {
          name: "General Admission",
          free: true,
          quantity_total: 100,
          minimum_quantity: 1,
          maximum_quantity: 10,
          hide_sale_dates: true,
        },
      }),
    });
  }

  const donation = list.find((t) => t.donation);
  const donationFields = { name: DONATION_NAME, hide_sale_dates: true };
  if (donation) {
    await eb(`/events/${eventId}/ticket_classes/${donation.id}/`, {
      method: "POST",
      body: JSON.stringify({ ticket_class: donationFields }),
    });
  } else {
    await eb(`/events/${eventId}/ticket_classes/`, {
      method: "POST",
      body: JSON.stringify({ ticket_class: { ...donationFields, donation: true, quantity_total: 100 } }),
    });
  }
}

interface TemplateMeta {
  name: string;
  description: string;
  currency: string;
  categoryId?: string;
  formatId?: string;
  logoId?: string;
}

let templateCache: TemplateMeta | null = null;
async function getTemplate(): Promise<TemplateMeta> {
  if (templateCache) return templateCache;
  const event = await eb(`/events/${TEMPLATE_EVENT_ID}/`);
  const desc = await eb(`/events/${TEMPLATE_EVENT_ID}/description/`);
  templateCache = {
    name: event.name?.html || event.name?.text || "",
    description: desc.description || "",
    currency: event.currency || "USD",
    categoryId: event.category_id || undefined,
    formatId: event.format_id || undefined,
    logoId: event.logo_id || undefined,
  };
  return templateCache;
}

async function createVenue(show: Show): Promise<string | undefined> {
  if (!show.venue && !show.address) return undefined;
  const venue = await eb(`/organizations/${ORG_ID}/venues/`, {
    method: "POST",
    body: JSON.stringify({
      venue: {
        name: show.venue || `${show.city}, ${show.region}`,
        address: {
          address_1: show.address || undefined,
          city: show.city,
          region: show.region,
          country: show.country || "US",
        },
      },
    }),
  });
  return venue.id;
}

export async function cloneEventForShow(show: Show): Promise<string> {
  if (!TOKEN) throw new Error("EVENTBRITE_TOKEN not set");

  const tpl = await getTemplate();
  const venueId = await createVenue(show);
  const timezone = timezoneForRegion(show.region);
  const { h, m } = parseDoorTime(show.doorTime);

  const created = await eb(`/organizations/${ORG_ID}/events/`, {
    method: "POST",
    body: JSON.stringify({
      event: {
        name: { html: tpl.name },
        description: { html: tpl.description },
        start: { utc: wallTimeToUtcIso(show.date, h, m, timezone), timezone },
        end: { utc: wallTimeToUtcIso(show.date, h + 3, m, timezone), timezone },
        currency: tpl.currency,
        online_event: false,
        listed: true,
        shareable: true,
        category_id: tpl.categoryId,
        format_id: tpl.formatId,
        logo_id: tpl.logoId,
        venue_id: venueId,
      },
    }),
  });
  const eventId: string = created.id;

  await ensureTickets(eventId);
  await eb(`/events/${eventId}/publish/`, { method: "POST" });

  return eventId;
}

export async function publishEventbrite(
  show: Show,
): Promise<{ eventbriteId?: string; error?: string }> {
  if (show.eventbriteId || !show.slug || !show.date) return {};
  try {
    const eventbriteId = await cloneEventForShow(show);
    await fetch(`${SHOWS_API}/chorus/shows`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SHOWS_TOKEN}` },
      body: JSON.stringify({ slug: show.slug, eventbriteId }),
    });
    return { eventbriteId };
  } catch (e) {
    console.error("[eventbrite] publish failed:", e);
    return { error: e instanceof Error ? e.message : "Eventbrite create failed" };
  }
}

export async function getAttendees(eventId: string): Promise<{ email: string; name: string }[]> {
  const out: { email: string; name: string }[] = [];
  let continuation: string | undefined;
  do {
    const qs = continuation ? `?continuation=${encodeURIComponent(continuation)}` : "";
    const page = await eb(`/events/${eventId}/attendees/${qs}`);
    for (const a of page.attendees || []) {
      if (a.status !== "Attending" || a.cancelled || a.refunded) continue;
      const email = a.profile?.email;
      if (email) out.push({ email, name: a.profile?.name || "" });
    }
    continuation = page.pagination?.has_more_items ? page.pagination?.continuation : undefined;
  } while (continuation);
  return out;
}

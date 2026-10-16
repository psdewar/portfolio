import type { Show } from "../shows-shared";
import type { Leg } from "../../fund/legs-shared";
import type { DataMode } from "./mode";
import { CHECKIN_SLUG_PREFIX, checkinShowFor } from "./checkin-fixtures";

type Sponsor = {
  showSlug: string | null;
  role?: "host" | "supporter";
  name: string;
  email: string;
  phone: string;
  city?: string;
  region?: string;
  country?: string;
  venue?: string;
  address?: string;
  date?: string;
  doorTime?: string;
  items: string[];
  submittedAt: string;
};


const DESCRIPTION_2000 = Array.from(
  { length: 40 },
  (_, i) => `Sentence ${i + 1} of a pasted description that keeps going.`,
)
  .join(" ")
  .slice(0, 2000);

const dateIn = (days: number) => {
  const d = new Date(Date.now() + days * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const baseShow = (slug: string, days: number): Show => ({
  slug,
  name: "Show",
  date: dateIn(days),
  doorTime: "7PM",
  city: "Seattle",
  region: "WA",
  country: "US",
  venue: "Venue",
  venueLabel: "Venue",
  doorLabel: null,
  address: "1 Example Way",
  stage: "booked",
  visibility: "public",
  leg: "worst-leg",
});

const worstShowRows: Partial<Show>[] = [
  {
    name: "Aleksandra Wiśniewska-Kowalczyk",
    venue: "The Konstantin Oberhauser-Wettstein Memorial Community Center & Gardens",
    venueLabel: "The Konstantin Oberhauser-Wettstein Memorial Community Center & Gardens",
    city: "Llanfairpwllgwyngyll",
    region: "Anglesey",
    country: "GB",
    address: "bartholomew.fitzgerald@northwind-industries-holdings.example.com",
    eventName: "Benachrichtigungseinstellungen Gartenfest und Gemeinschaftsabend",
    doorLabel: "Invitation expired 12 days ago",
    tags: "customer-feedback-from-enterprise-onboarding, design, frontend, q3, urgent, needs-review",
    posterLine: "Paramètres de confidentialité et de sécurité",
    doorTime: "12AM",
  },
  {
    name: "J",
    venue: "https://example.com/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a?tab=comments&filter=unresolved",
    venueLabel: "https://example.com/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a?tab=comments&filter=unresolved",
    city: "X",
    region: "Q",
    country: "US",
    address: "a@b.co",
    doorTime: "6:30PM",
  },
  {
    name: "王秀英",
    venue: "东京都港区六本木ヒルズ森タワー",
    venueLabel: "东京都港区六本木ヒルズ森タワー",
    city: "東京",
    region: "JP-13",
    country: "JP",
    address: "東京都港区六本木6-10-1",
  },
  {
    name: "نور الهدى عبد الرحمن",
    venue: "قاعة المؤتمرات الكبرى",
    venueLabel: "قاعة المؤتمرات الكبرى",
    city: "الرياض",
    region: "SA-01",
    country: "SA",
  },
  {
    name: "Đặng Thị Ngọc Hân",
    venue: "Nhà hát Lớn Hà Nội",
    venueLabel: "Nhà hát Lớn Hà Nội",
    city: "Thành phố Hồ Chí Minh",
    region: "VN-SG",
  },
  {
    name: "🦊 Fox\nSecond line",
    venue: "<script>alert(1)</script> &amp; **bold**",
    venueLabel: "<script>alert(1)</script> &amp; **bold**",
    doorLabel: "Doors 7PM\nMusic 8PM",
  },
  {
    name: "Christopher Alexander Montgomery III",
    venue: null,
    venueLabel: null,
    address: null,
    doorLabel: null,
    tags: null,
    eventName: null,
  },
  {
    name: DESCRIPTION_2000,
    venue: "Q3 Board Deck — FINAL (revised) v12 [approved by legal].pdf",
    venueLabel: null,
    status: "cancelled",
  },
  { name: "Private living room", visibility: "private", venue: "14 Elm Street", address: "14 Elm Street" },
  { name: "Draft", stage: "intent", visibility: "draft" },
  { name: "Open invite", stage: "intent", visibility: "draft", slug: "draft-0" },
  { name: "Past show", date: "1970-01-01" },
  { name: "Late show", date: "2025-12-31", doorTime: "11:30PM" },
];

const worstShows = (): Show[] =>
  worstShowRows.map((row, i) => ({
    ...baseShow(`worst-show-${String(i + 1).padStart(2, "0")}`, 7 + i * 3),
    ...row,
  }));

const hugeShows = (): Show[] =>
  Array.from({ length: 1200 }, (_, i) => {
    const row = worstShowRows[i % worstShowRows.length];
    return {
      ...baseShow(`huge-show-${String(i + 1).padStart(4, "0")}`, i < 200 ? i + 1 : -(i - 199)),
      ...row,
      ...(row.slug === "draft-0" ? { slug: `huge-show-${String(i + 1).padStart(4, "0")}` } : {}),
      name: `${i + 1}. ${row.name ?? "Show"}`.slice(0, 120),
    };
  });

const oneShow = (): Show[] => [
  { ...baseShow("one-show", 14), name: "One show", venue: "One Venue", venueLabel: "One Venue" },
];

const worstLeg = (slug: string): Leg => ({
  slug,
  fund: {
    destination: "Northern California and the Greater San Francisco Bay Area",
    shortName: "NorCal",
    nights: 1,
    flightBy: dateIn(30),
    lines: [
      { key: "flight", label: "Flight", note: "round-trip, includes checked bags for my equipment", amount: 12345678.9 },
      { key: "car", label: "Rental car", note: "includes gas, tolls, and parking", amount: 1 },
      { key: "lodging", label: "Benachrichtigungseinstellungen", note: DESCRIPTION_2000.slice(0, 300), amount: 0 },
      { key: "food", label: "Food", note: "<script>alert(1)</script> &amp;", amount: 1284 },
    ],
    coveredInKind: ["bartholomew.fitzgerald@northwind-industries-holdings.example.com", "J"],
    booked: [
      {
        slug: "worst-show-01",
        venue: "The Konstantin Oberhauser-Wettstein Memorial Community Center & Gardens",
        city: "Llanfairpwllgwyngyll",
        date: dateIn(7),
        doorTime: "12AM",
      },
      { venue: "J", private: true },
    ],
    previousTrips: [
      {
        label: "Earlier trip with a very long label that keeps going past one line",
        lines: [{ key: "flight", label: "Flight", note: "", amount: 12345678.9 }],
      },
    ],
  },
  pamphlet: {
    label: "Aleksandra Wiśniewska-Kowalczyk",
    tags: "customer-feedback-from-enterprise-onboarding",
    placeholders: [{ date: dateIn(40), label: "TBD" }],
    shows: {
      "worst-show-01": {
        venueLabel: "The Konstantin Oberhauser-Wettstein Memorial Community Center & Gardens",
        dateLabel: "Dec 31",
        doorsOpen: "12AM",
      },
    },
  },
});

const oneLeg = (slug: string): Leg => ({
  slug,
  fund: {
    destination: "One Place",
    shortName: "One",
    nights: 1,
    lines: [{ key: "flight", label: "Flight", note: "one line", amount: 1 }],
  },
});

const hugeLegs = (): Leg[] =>
  Array.from({ length: 1000 }, (_, i) => ({
    ...worstLeg(`huge-leg-${i + 1}`),
  }));

const worstSponsors = (): Sponsor[] => {
  const base = { items: [] as string[], submittedAt: "2025-12-31T23:30:00-08:00" };
  return [
    {
      ...base,
      showSlug: "worst-show-01",
      role: "host",
      name: "Aleksandra Wiśniewska-Kowalczyk",
      email: "bartholomew.fitzgerald@northwind-industries-holdings.example.com",
      phone: "+1 (555) 010-0100 ext. 12345",
      venue: "The Konstantin Oberhauser-Wettstein Memorial Community Center & Gardens",
      address: "14 Elm Street",
      city: "Llanfairpwllgwyngyll",
      region: "Anglesey",
      country: "GB",
      date: dateIn(7),
      doorTime: "12AM",
      items: ["piano", "<script>alert(1)</script>", "seating for 40 with a very long description of the room layout"],
    },
    { ...base, showSlug: "worst-show-02", role: "host", name: "J", email: "a@b.co", phone: "" },
    { ...base, showSlug: "worst-show-03", role: "host", name: "王秀英", email: "wang@example.org", phone: "", submittedAt: "1970-01-01T00:00:00Z" },
    { ...base, showSlug: null, role: "supporter", name: "نور الهدى عبد الرحمن", email: "noor@example.test", phone: "" },
    { ...base, showSlug: "worst-show-05", role: "host", name: "Đặng Thị Ngọc Hân", email: "han@example.test", phone: "" },
    { ...base, showSlug: "worst-show-06", role: "host", name: "🦊 Fox\nSecond line", email: "fox@example.test", phone: "" },
    { ...base, showSlug: "worst-show-07", name: "Christopher Alexander Montgomery III", email: "first.last+billing-notifications@example.com", phone: "" },
  ];
};

const hugeSponsors = (): Sponsor[] => {
  const rows = worstSponsors();
  return Array.from({ length: 1200 }, (_, i) => ({
    ...rows[i % rows.length],
    showSlug: i % rows.length === 3 ? null : `huge-show-${String(i + 1).padStart(4, "0")}`,
  }));
};

const oneSponsor = (): Sponsor[] => [
  { showSlug: "one-show", role: "host", name: "Jo", email: "jo@example.test", phone: "", items: [], submittedAt: new Date().toISOString() },
];

const farFuture = () => new Date(Date.now() + 400 * 86_400_000).toISOString();

export function fixtureFor(resource: string, mode: DataMode): unknown {
  const base = resource.split("?")[0].split("/")[0];
  if (base === "shows") {
    if (mode === "empty") return [];
    if (mode === "one") return oneShow();
    if (mode === "huge") return hugeShows();
    return worstShows();
  }
  if (base === "legs") {
    if (mode === "empty") return [];
    if (mode === "one") return [oneLeg("worst-leg")];
    if (mode === "huge") return [worstLeg("worst-leg"), ...hugeLegs()];
    return [worstLeg("worst-leg")];
  }
  if (base === "sponsors") {
    if (mode === "empty") return [];
    if (mode === "one") return oneSponsor();
    if (mode === "huge") return hugeSponsors();
    return worstSponsors();
  }
  if (base === "schedule") {
    return { nextStream: mode === "empty" ? null : farFuture() };
  }
  return mode === "empty" ? [] : {};
}

export function fixtureShowFor(slug: string, mode: DataMode): Show | null {
  if (slug.startsWith(CHECKIN_SLUG_PREFIX)) return checkinShowFor(slug, mode);
  if (mode === "empty") return null;
  if (mode === "one") return { ...oneShow()[0], slug };
  return { ...worstShows()[0], slug, status: undefined, visibility: "public", stage: "booked" };
}

export function fixtureHostFor(slug: string, mode: DataMode): (Sponsor & { showSlug: string }) | null {
  if (mode === "empty") return null;
  if (mode === "one") return { ...oneSponsor()[0], showSlug: slug, email: "" };
  return { ...worstSponsors()[0], showSlug: slug, email: "" };
}

export function fixtureLegFor(slug: string, mode: DataMode): Leg | undefined {
  if (mode === "empty") return undefined;
  if (mode === "one") return oneLeg(slug);
  return worstLeg(slug);
}

export function fixtureRsvpCounts(mode: DataMode): Record<string, { responses: number; attending: number }> {
  if (mode === "empty") return {};
  if (mode === "one") return { "one-show": { responses: 1, attending: 1 } };
  const rows = mode === "huge" ? hugeShows() : worstShows();
  return Object.fromEntries(
    rows.map((s, i) => [s.slug, i % 3 === 0 ? { responses: 1284, attending: 3071 } : i % 3 === 1 ? { responses: 1, attending: 1 } : { responses: 0, attending: 0 }]),
  );
}

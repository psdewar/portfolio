import type { Show } from "../shows-shared";
import { todayIn } from "../dates";
import type { DataMode } from "./mode";

export const CHECKIN_SLUG_PREFIX = "ci-";

const base = (slug: string): Show => ({
  slug,
  name: "From The Ground Up",
  date: todayIn("Pacific/Honolulu"),
  doorTime: "7PM",
  city: "Fulton",
  region: "MD",
  country: "US",
  venue: "Venue",
  venueLabel: "Venue",
  doorLabel: null,
  address: "1 Example Way",
  stage: "booked",
  visibility: "public",
  leg: "worst-leg",
});

const variants: Record<string, Partial<Show>> = {
  long: { city: "Llanfairpwllgwyngyll", region: "Anglesey", venue: "The Konstantin Oberhauser-Wettstein Memorial Community Center & Gardens" },
  longregion: { city: "Thành phố Hồ Chí Minh", region: "Bà Rịa-Vũng Tàu Province" },
  rtl: { city: "الرياض", region: "السعودية" },
  cjk: { city: "東京都港区六本木", region: "JP-13" },
  fox: { city: "🦊 Fox Hollow", region: "WA" },
  nodate: { date: "" },
  noregion: { region: undefined },
  short: { city: "X", region: "Q" },
};

export function checkinShowFor(slug: string, mode: DataMode): Show | null {
  if (mode === "empty") return null;
  const key = slug.slice(CHECKIN_SLUG_PREFIX.length);
  if (mode === "one") return { ...base(slug), city: "Bend", region: "OR" };
  return { ...base(slug), ...(variants[key] ?? variants.long) };
}

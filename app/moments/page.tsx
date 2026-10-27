import type { Metadata } from "next";
import { cookies } from "next/headers";
import MomentsClient from "./MomentsClient";
import { getFundingLegSlug } from "../fund/legs";
import { getFeaturedGalleryItems } from "../api/shared/moments";
import { getShows, isShowListed } from "../lib/shows";
import { CHECKIN_COOKIE, CHECKIN_START, isRunnable, pickCheckinSlug } from "../lib/checkin-show";
import { todayIn } from "../lib/dates";

const title = "Moments from the concert";
const description =
  "Send your photos and videos from From The Ground Up. Private link, passcode required.";
const url = "https://peytspencer.com/moments";
const ogImage = "https://peytspencer.com/og/home.jpeg";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/moments" },
  robots: { index: false, follow: false },
  openGraph: {
    title,
    description,
    url,
    siteName: "Peyt Spencer",
    type: "website",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "From The Ground Up" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
    creator: "@peytspencer",
  },
};

export default async function MomentsPage() {
  const fundSlug = await getFundingLegSlug().catch(() => undefined);
  const items = await getFeaturedGalleryItems(fundSlug);
  const cookieValue = (await cookies()).get(CHECKIN_COOKIE)?.value;
  const shows = await getShows();
  const checkinSlug = pickCheckinSlug(shows, cookieValue);
  const today = todayIn("America/New_York");
  const pastShows = shows
    .filter(isRunnable)
    .filter(isShowListed)
    .filter((s) => s.date >= CHECKIN_START && s.date <= today)
    .map((s) => ({ slug: s.slug, date: s.date }));
  const checkinHref = checkinSlug ? `/checkin/${checkinSlug}` : "/listen";
  return <MomentsClient checkinHref={checkinHref} pastShows={pastShows} items={items} />;
}

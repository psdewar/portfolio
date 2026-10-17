import { redirect } from "next/navigation";
import { getShowBySlug, getShows, getTourCounts } from "../../lib/shows";
import { tourMomentum } from "../../lib/tour-momentum";
import { todayIn } from "../../lib/dates";
import { isCheckinOpen } from "../../lib/checkin-show";
import { storyParagraphs } from "../../data/story";
import CheckInClient from "../CheckInClient";

export const metadata = { robots: { index: false, follow: false } };

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string; no?: string; capture?: string; rsvpd?: string }>;
}

export default async function CheckinPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview, no, capture, rsvpd } = await searchParams;
  const show = await getShowBySlug(slug);
  if (!show) redirect("/support");
  if (!isCheckinOpen(show) && preview !== "1") redirect("/support");

  const { concertCount } = tourMomentum(await getShows(), show.slug);
  const ticketNoOverride = no && /^\d+$/.test(no) ? parseInt(no, 10) : null;

  return (
    <CheckInClient
      slug={show.slug}
      city={show.city}
      region={show.region}
      date={show.date}
      preview={preview === "1"}
      capture={capture === "1"}
      ticketNoOverride={ticketNoOverride}
      rsvpdOverride={rsvpd === "1"}
      past={show.date < todayIn("Pacific/Honolulu")}
      concertCount={concertCount}
      storyParagraphs={storyParagraphs(await getTourCounts())}
    />
  );
}

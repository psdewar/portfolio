import { redirect } from "next/navigation";
import { getShowBySlug, isCheckinLive, getVenueLabel } from "../../lib/shows";
import CheckInClient from "./CheckInClient";

export const metadata = { robots: { index: false, follow: false } };

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string; no?: string; capture?: string; rsvpd?: string }>;
}

export default async function CheckInPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview, no, capture, rsvpd } = await searchParams;
  const show = await getShowBySlug(slug);
  if (!show) redirect("/support");
  if (!isCheckinLive(show) && preview !== "1") redirect("/support");

  const ticketNoOverride = no && /^\d+$/.test(no) ? parseInt(no, 10) : null;

  return (
    <CheckInClient
      slug={show.slug}
      city={show.city}
      region={show.region}
      date={show.date}
      venueLabel={getVenueLabel(show)}
      preview={preview === "1"}
      capture={capture === "1"}
      ticketNoOverride={ticketNoOverride}
      rsvpdOverride={rsvpd === "1"}
    />
  );
}

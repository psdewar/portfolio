import { redirect, notFound } from "next/navigation";
import { getShowBySlug } from "../../lib/shows";
import RSVPForm from "./RSVPForm";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ShowRSVPPage({ params }: Props) {
  const { slug } = await params;
  const show = await getShowBySlug(slug);

  if (!show || show.visibility === "draft") notFound();
  if (show.status !== "upcoming" || show.visibility === "private") redirect("/rsvp");

  return (
    <RSVPForm
      eventId={show.slug}
      date={show.date}
      city={show.city}
      region={show.region}
      doorTime={show.doorTime}
      doorLabel={show.doorLabel}
      venue={show.venue}
      venueLabel={show.venueLabel}
      address={show.address}
    />
  );
}

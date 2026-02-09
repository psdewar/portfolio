import { notFound } from "next/navigation";
import { getShowBySlug } from "../../lib/shows";
import RSVPForm from "./RSVPForm";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ShowRSVPPage({ params }: Props) {
  const { slug } = await params;
  const show = await getShowBySlug(slug);

  if (!show || show.status !== "upcoming") notFound();

  return (
    <RSVPForm
      eventId={show.id}
      date={show.date}
      city={show.city}
      region={show.region}
      doorTime={show.doorTime}
    />
  );
}

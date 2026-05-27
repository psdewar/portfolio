import { redirect } from "next/navigation";
import { getUpcomingShows } from "../../lib/shows";
import RSVPShell from "../RSVPShell";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ShowRSVPPage({ params }: Props) {
  const { slug } = await params;
  const shows = await getUpcomingShows();
  const show = shows.find((s) => s.slug === slug);

  if (!show || show.access === "private") redirect("/rsvp");

  return <RSVPShell shows={shows} initialSlug={slug} />;
}

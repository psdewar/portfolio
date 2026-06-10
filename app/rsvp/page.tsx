import { redirect } from "next/navigation";
import { getUpcomingShows } from "../lib/shows";
import RSVPShell from "./RSVPShell";

export default async function RSVPPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const shows = await getUpcomingShows();

  if (shows.length === 0) {
    redirect("/support?success=no_shows");
  }

  const rsvpable = shows.filter((s) => s.visibility !== "private");

  if (!params.submitted && rsvpable.length === 1) {
    redirect(`/rsvp/${rsvpable[0].slug}`);
  }

  return <RSVPShell shows={shows} slug={params.submitted} />;
}

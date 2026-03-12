import { redirect } from "next/navigation";
import { getUpcomingShows } from "../lib/shows";
import RSVPShell from "./RSVPShell";

export default async function RSVPPage() {
  const shows = await getUpcomingShows();

  if (shows.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center px-4">
        <div className="text-center">
          <h1
            className="text-4xl md:text-6xl text-neutral-900 dark:text-white mb-4 font-extrabold uppercase"
            style={{ fontFamily: '"Parkinsans", sans-serif' }}
          >
            No Upcoming Shows
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">Check back soon for tour dates.</p>
        </div>
      </div>
    );
  }

  if (shows.length === 1) redirect(`/rsvp/${shows[0].slug}`);

  return <RSVPShell shows={shows} />;
}

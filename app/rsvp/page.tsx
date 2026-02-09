import Link from "next/link";
import { getUpcomingShows } from "../lib/shows";
import Poster from "../components/Poster";

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
          <p className="text-neutral-500 dark:text-neutral-400">
            Check back soon for tour dates.
          </p>
        </div>
      </div>
    );
  }

  const [hero, ...rest] = shows;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Hero: next upcoming show */}
      <div className="relative">
        <div className="max-w-lg mx-auto">
          <Poster
            date={hero.date}
            city={hero.city}
            region={hero.region}
            doorTime={hero.doorTime}
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-6">
          <Link
            href={`/rsvp/${hero.slug}`}
            className="px-8 py-4 text-[#0a0a0a] font-medium text-lg rounded-lg transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(to right, #d4a553, #e8c474)" }}
          >
            RSVP — {hero.city}, {hero.region}
          </Link>
        </div>
      </div>

      {/* Remaining shows */}
      {rest.length > 0 && (
        <div className="max-w-2xl mx-auto px-4 py-12">
          <h2
            className="text-2xl text-neutral-900 dark:text-white mb-6 font-bold uppercase"
            style={{ fontFamily: '"Parkinsans", sans-serif' }}
          >
            More Shows
          </h2>
          <div className="space-y-3">
            {rest.map((show) => (
              <Link
                key={show.slug}
                href={`/rsvp/${show.slug}`}
                className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
              >
                <div>
                  <div className="font-medium text-neutral-900 dark:text-white group-hover:text-[#d4a553] transition-colors">
                    {show.city}, {show.region}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    {formatDate(show.date)} · Doors at {show.doorTime}
                  </div>
                </div>
                <span
                  className="text-sm font-medium uppercase tracking-wider"
                  style={{ color: "#d4a553" }}
                >
                  RSVP
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

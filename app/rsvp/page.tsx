import Link from "next/link";
import { redirect } from "next/navigation";
import { formatMonthDay } from "../lib/dates";
import { getUpcomingShows } from "../lib/shows";

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

  if (shows.length === 1) redirect(`/rsvp/${shows[0].slug}`);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <h1
        className="text-3xl md:text-5xl text-[#f0ede6] mb-2 font-extrabold uppercase tracking-tight text-center"
        style={{ fontFamily: '"Parkinsans", sans-serif' }}
      >
        Where are you joining us?
      </h1>
      <p className="text-[#c0b8a8] mb-10 text-center">From The Ground Up Tour</p>
      <div className="w-full max-w-md space-y-3">
        {shows.map((show) => (
          <Link
            key={show.slug}
            href={`/rsvp/${show.slug}`}
            className="flex items-center justify-between w-full px-6 py-5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, rgba(212,165,83,0.15), rgba(232,196,116,0.08))", border: "1px solid rgba(212,165,83,0.3)" }}
          >
            <div>
              <div className="text-[#f0ede6] font-semibold text-lg">
                {show.venue || show.city}, {show.region}
              </div>
              <div className="text-[#c0b8a8] text-sm">
                {formatMonthDay(show.date)} · Doors at {show.doorTime}
              </div>
            </div>
            <div
              className="text-sm font-bold uppercase tracking-widest flex-shrink-0"
              style={{ color: "#d4a553" }}
            >
              RSVP
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

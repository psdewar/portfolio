import { Suspense } from "react";
import TourMapSection from "../components/TourMapSection";
import TipsAndSocials from "./TipsAndSocials";
import { SupporterSection } from "../components/SupporterSection";
import { getUpcomingShows } from "../lib/shows";

const REGION_TZ: Record<string, string> = {
  BC: "America/Vancouver",
  AB: "America/Edmonton",
  SK: "America/Regina",
  MB: "America/Winnipeg",
  ON: "America/Toronto",
  QC: "America/Toronto",
  NB: "America/Halifax",
  NS: "America/Halifax",
  PE: "America/Halifax",
  NL: "America/St_Johns",
};

function getTodayInTz(tz: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const { country: countryOverride } = await searchParams;
  const shows = await getUpcomingShows();
  const todayShow = shows.find((s) => {
    if (s.country !== "CA") return false;
    const tz = REGION_TZ[s.region] ?? "America/Vancouver";
    return getTodayInTz(tz) === s.date;
  });

  const country = countryOverride?.toUpperCase() === "US" ? "US" : "CA";

  return (
    <div className="bg-neutral-50 dark:bg-neutral-950">
      <Suspense>
        <TipsAndSocials country={country} />
      </Suspense>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="max-w-lg mx-auto">
          <h2 className="font-bebas text-3xl text-neutral-900 dark:text-white mb-4">Tour Stops</h2>
          <Suspense>
            <TourMapSection />
          </Suspense>
        </div>
      </section>

      <SupporterSection />
    </div>
  );
}

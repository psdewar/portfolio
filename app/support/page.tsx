import { Suspense } from "react";
import TourStops from "../components/TourStops";
import TipsAndSocials, { SocialSection } from "./TipsAndSocials";
import { SupporterSection } from "../components/SupporterSection";
import { ShopContent } from "../components/ShopContent";
import { getShows, isShowListable } from "../lib/shows";

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
  searchParams: Promise<{ now?: string }>;
}) {
  const params = await searchParams;
  const liveShows = (await getShows())
    .filter(isShowListable)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const todayShow = liveShows.find((s) => {
    if (s.country !== "CA") return false;
    if (params.now) return params.now === s.date;
    const tz = REGION_TZ[s.region] ?? "America/Vancouver";
    return getTodayInTz(tz) === s.date;
  });

  return (
    <div className="bg-neutral-50 dark:bg-neutral-950">
      <Suspense>
        <TipsAndSocials interacFirst={!!todayShow} />
      </Suspense>

      <section id="preorder" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 scroll-mt-16">
        <div className="max-w-lg mx-auto">
          <ShopContent embedded />
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="flex flex-col gap-4 max-w-lg mx-auto">
          <TourStops shows={liveShows} />
          <a
            href="/sponsor"
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-base underline underline-offset-2 transition-colors"
          >
            Interested in sponsoring a live concert?
          </a>
        </div>
      </section>

      <section id="find-me" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 scroll-mt-20">
        <div className="max-w-lg mx-auto">
          <SocialSection />
        </div>
      </section>

      <SupporterSection />
    </div>
  );
}

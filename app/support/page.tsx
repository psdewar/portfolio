import { Suspense } from "react";
import TourMapSection from "../components/TourMapSection";
import TipsAndSocials from "./TipsAndSocials";
import { SupporterSection } from "../components/SupporterSection";

export default function SupportPage() {
  return (
    <div className="bg-neutral-50 dark:bg-neutral-950">
      <Suspense>
        <TipsAndSocials />
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

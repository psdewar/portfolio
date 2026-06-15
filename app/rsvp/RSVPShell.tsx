"use client";

import { useEffect, useState } from "react";
import { Show } from "../lib/shows";
import Poster from "../components/Poster";
import ShowList from "../components/ShowList";
import RSVPForm from "./[slug]/RSVPForm";
import SubmittedToast from "./SubmittedToast";

export default function RSVPShell({
  shows,
  slug,
  initialSlug,
}: {
  shows: Show[];
  slug?: string;
  initialSlug?: string;
}) {
  const initial = initialSlug ? (shows.find((s) => s.slug === initialSlug) ?? null) : null;
  const [selected, setSelected] = useState<Show | null>(initial);
  const [toastDismissed, setToastDismissed] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname;
      const m = path.match(/^\/rsvp\/([^/]+)/);
      setSelected(m ? (shows.find((s) => s.slug === m[1]) ?? null) : null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [shows]);

  const handleSelect = (show: Show) => {
    window.history.pushState(null, "", `/rsvp/${show.slug}`);
    setSelected(show);
  };

  const handleBack = () => {
    window.history.pushState(null, "", "/rsvp");
    setSelected(null);
  };

  const toast = slug && !toastDismissed && (
    <SubmittedToast slug={slug} onDismiss={() => setToastDismissed(true)} />
  );

  if (selected) {
    return (
      <>
        {toast}
        <RSVPForm
          eventId={selected.slug}
          date={selected.date}
          city={selected.city}
          region={selected.region}
          doorTime={selected.doorTime}
          doorLabel={selected.doorLabel}
          venue={selected.venue}
          venueLabel={selected.venueLabel}
          address={selected.address}
          tags={selected.tags}
          flights={selected.flights}
          onBack={handleBack}
        />
      </>
    );
  }

  const list = (
    <>
      <div className="mb-8 md:mb-10 px-4 sm:px-6 lg:px-8">
        <h1
          className="text-neutral-900 dark:text-white mb-2 font-extrabold uppercase leading-none text-[11.76vw] lg:text-[7.5vh]"
          style={{ fontFamily: '"Parkinsans", sans-serif' }}
        >
          RSVP
        </h1>
        <p
          className="text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
          style={{
            fontFamily: '"Space Mono", monospace',
            fontSize: "clamp(0.875rem, 0.5vw + 0.7rem, 1.25rem)",
          }}
        >
          Choose your concert
        </p>
      </div>
      <ShowList shows={shows} onSelect={handleSelect} />
    </>
  );

  return (
    <div
      className="fixed left-0 right-0 top-14 bg-white dark:bg-neutral-950 overflow-hidden"
      style={{ bottom: "var(--player-h, 0px)" }}
    >
      {toast}

      <div className="lg:hidden flex flex-col h-full overflow-y-auto">
        <div className="py-8">{list}</div>
        <div className="flex-shrink-0">
          <Poster />
        </div>
      </div>

      <div className="hidden lg:flex absolute inset-0 right-4 gap-8">
        <div className="h-full flex-shrink-0 aspect-[480/720]">
          <Poster />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center py-6">{list}</div>
      </div>
    </div>
  );
}

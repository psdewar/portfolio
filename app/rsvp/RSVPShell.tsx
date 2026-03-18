"use client";

import { useState } from "react";
import { ArrowRightIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { Show } from "../lib/shows";
import { formatEventDateShort } from "../lib/dates";
import Poster from "../components/Poster";
import RSVPForm from "./[slug]/RSVPForm";

export default function RSVPShell({ shows }: { shows: Show[] }) {
  const [selected, setSelected] = useState<Show | null>(null);

  const handleSelect = (show: Show) => {
    window.history.pushState(null, "", `/rsvp/${show.slug}`);
    setSelected(show);
  };

  const handleBack = () => {
    window.history.pushState(null, "", "/rsvp");
    setSelected(null);
  };

  if (selected) {
    return (
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
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="fixed left-0 right-0 top-14 bottom-0 bg-white dark:bg-neutral-950 overflow-hidden">
      {/* Mobile layout */}
      <div className="lg:hidden flex flex-col h-full overflow-y-auto">
        <div className="px-[6%] py-8">
          <ShowList shows={shows} onSelect={handleSelect} />
        </div>
        <div className="flex-shrink-0">
          <Poster />
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex absolute inset-0 right-4 gap-8">
        <div className="h-full flex-shrink-0">
          <Poster />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-6">
          <ShowList shows={shows} onSelect={handleSelect} />
        </div>
      </div>
    </div>
  );
}

function ShowList({ shows, onSelect }: { shows: Show[]; onSelect: (show: Show) => void }) {
  return (
    <div>
      <div className="mb-6">
        <h1
          className="text-4xl md:text-6xl lg:text-8xl text-neutral-900 dark:text-white mb-2 font-extrabold uppercase"
          style={{ fontFamily: '"Parkinsans", sans-serif' }}
        >
          RSVP
        </h1>
        <p
          className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm uppercase tracking-wider"
          style={{ fontFamily: '"Space Mono", monospace' }}
        >
          Choose your concert
        </p>
      </div>
      <div className="space-y-3">
        {shows.map((show) =>
          show.access === "private" ? (
            <div
              key={show.slug}
              className="w-full flex items-center gap-4 px-6 py-5 rounded-xl"
              style={{
                background: "rgba(212,165,83,0.06)",
                border: "1px solid rgba(212,165,83,0.2)",
              }}
            >
              <div className="flex-1 min-w-0">
                <div
                  className="text-neutral-900 dark:text-[#f0ede6] font-bold text-xl"
                  style={{ fontFamily: '"Parkinsans", sans-serif' }}
                >
                  {show.venueLabel || (
                    <>
                      {show.venue || show.address ? `${show.venue || show.address}, ` : ""}
                      {show.city}, {show.region}
                    </>
                  )}
                </div>
                <div
                  className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm mt-1 uppercase tracking-wider"
                  style={{ fontFamily: '"Space Mono", monospace' }}
                >
                  {formatEventDateShort(show.date)}
                </div>
              </div>
              <LockSimpleIcon
                className="shrink-0"
                size={20}
                weight="duotone"
                style={{ color: "#d4a553" }}
              />
            </div>
          ) : (
            <button
              key={show.slug}
              onClick={() => onSelect(show)}
              className="w-full flex items-center gap-4 px-6 py-5 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99] group"
              style={{
                background: "rgba(212,165,83,0.06)",
                border: "1px solid rgba(212,165,83,0.2)",
              }}
            >
              <div className="flex-1 min-w-0">
                <div
                  className="text-neutral-900 dark:text-[#f0ede6] font-bold text-xl"
                  style={{ fontFamily: '"Parkinsans", sans-serif' }}
                >
                  {show.venueLabel || (
                    <>
                      {show.venue || show.address ? `${show.venue || show.address}, ` : ""}
                      {show.city}, {show.region}
                    </>
                  )}
                </div>
                <div
                  className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm mt-1 uppercase tracking-wider"
                  style={{ fontFamily: '"Space Mono", monospace' }}
                >
                  {formatEventDateShort(show.date)} ·{" "}
                  {show.doorLabel || `Doors open at ${show.doorTime}`}
                </div>
              </div>
              <ArrowRightIcon
                className="shrink-0 transition-transform group-hover:translate-x-1"
                size={20}
                weight="bold"
                style={{ color: "#d4a553" }}
              />
            </button>
          ),
        )}
      </div>
    </div>
  );
}

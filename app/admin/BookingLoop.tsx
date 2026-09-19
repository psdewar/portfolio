"use client";

import { ReactNode, useState } from "react";

export default function BookingLoop({ actions }: { actions: ReactNode }) {
  const [open, setOpen] = useState(false);
  const notes = [
    "I'm a rapper from Bellevue, Washington. In August I left Microsoft to be a full-time artist, now touring North America to share my concert-conversation From The Ground Up, introducing the Faith to an audience that is not youth-only nor Baha'i-only. Since March I've done 20.",
    "All I need is one friend in your community to host a gathering in their living room, a coffee shop, Center, or any venue you suggest. I bring my own equipment, and hosting is low-maintenance: under half an hour for setup, an hour of music, then another hour to connect and take photos.",
    "The honorarium is a gift that recognizes the concert, separate from expenses. Admission is pay what you want and defaults to free.",
  ];
  return (
    <div className="mb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-medium tracking-tight text-neutral-900 dark:text-white">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex items-center gap-3 text-left"
          >
            To keep in mind when I write to a community
            <span className="text-neutral-400 font-normal">{open ? "−" : "+"}</span>
          </button>
        </h1>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {open && (
        <div className="mt-5 space-y-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          {notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      )}
    </div>
  );
}

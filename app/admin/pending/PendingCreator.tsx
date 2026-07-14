"use client";

import SponsorForm from "../../components/SponsorForm";

export default function PendingCreator() {
  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
          New pending show
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Fill this out on the sponsor&apos;s behalf. It creates a show hidden from{" "}
          <span className="font-mono">/rsvp</span> and drops you back in the hosts menu to amend
          it or copy their one-click confirmation link. When they confirm, the show publishes and
          its Eventbrite event goes live.
        </p>
      </div>
      <SponsorForm mode="host" pending />
    </div>
  );
}

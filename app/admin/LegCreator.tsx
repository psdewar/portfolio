"use client";

import { useState } from "react";
import { type Leg } from "../fund/legs";

const input =
  "w-full px-2 lg:px-3 py-1.5 text-sm lg:text-base rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600";

export default function LegCreator({
  legs,
  setLegs,
  onCreated,
  onMessage,
}: {
  legs: Leg[];
  setLegs: React.Dispatch<React.SetStateAction<Leg[]>>;
  onCreated: (slug: string) => void;
  onMessage: (type: "success" | "error", text: string) => void;
}) {
  const [newSlug, setNewSlug] = useState("");

  const createLeg = async () => {
    const slug = newSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (!slug || legs.some((l) => l.slug === slug)) {
      onMessage("error", "Need a unique slug");
      return;
    }
    setLegs((prev) => [...prev, { slug }]);
    onCreated(slug);
    setNewSlug("");
    const res = await fetch("/api/legs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    onMessage(res.ok ? "success" : "error", res.ok ? "Leg created" : "Create failed");
  };

  return (
    <div className="flex gap-2">
      <input
        className={input}
        placeholder="New leg, for example socal"
        value={newSlug}
        onChange={(e) => setNewSlug(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && createLeg()}
      />
      <button
        onClick={createLeg}
        className="min-h-11 inline-flex items-center justify-center shrink-0 px-5 text-sm lg:text-base font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-neutral-400 transition-colors"
      >
        Create leg
      </button>
    </div>
  );
}

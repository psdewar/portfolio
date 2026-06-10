import type { Show } from "../lib/shows";
import TourMapSection from "./TourMapSection";

const HEADINGS = {
  display: { Tag: "h2", className: "font-bebas text-3xl text-neutral-900 dark:text-white" },
  label: { Tag: "h3", className: "text-xs text-neutral-400 uppercase tracking-wider mb-2" },
} as const;

export default function TourStops({
  shows,
  variant = "display",
}: {
  shows: Show[];
  variant?: keyof typeof HEADINGS;
}) {
  if (shows.length === 0) return null;
  const { Tag, className } = HEADINGS[variant];
  return (
    <>
      <Tag className={className}>Tour Stops</Tag>
      <TourMapSection shows={shows} />
    </>
  );
}

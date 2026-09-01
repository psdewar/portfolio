"use client";

import { useState } from "react";

export default function StoryReadMore({ paragraphs }: { paragraphs: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? paragraphs : paragraphs.slice(0, 1);
  return (
    <>
      {shown.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
      {!expanded && paragraphs.length > 1 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full min-h-11 items-center text-left font-semibold text-neutral-900 underline decoration-neutral-400 underline-offset-4 hover:decoration-current dark:text-white dark:decoration-neutral-600"
        >
          Read more
        </button>
      )}
    </>
  );
}

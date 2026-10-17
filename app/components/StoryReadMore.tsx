"use client";

import { useState } from "react";
import { storyFullText, type StoryParagraph } from "../data/story";
import { StoryBlock } from "./StoryParagraphs";

export default function StoryReadMore({ paragraphs }: { paragraphs: StoryParagraph[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded && paragraphs.length > 1) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="group block w-full text-left"
      >
        {storyFullText(paragraphs[0])}{" "}
        <span className="font-semibold text-neutral-900 underline decoration-neutral-400 underline-offset-4 group-hover:decoration-current dark:text-white dark:decoration-neutral-600">
          Read more
        </span>
      </button>
    );
  }

  return (
    <>
      {paragraphs.map((p, i) => (
        <StoryBlock key={i} text={storyFullText(p)} photo={p.photo} />
      ))}
    </>
  );
}

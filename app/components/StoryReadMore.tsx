"use client";

import { useRef, useState } from "react";
import { storyFullText, type StoryParagraph } from "../data/story";
import { StoryModal } from "./ReadMyStory";

export default function StoryReadMore({ paragraphs }: { paragraphs: StoryParagraph[] }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (paragraphs.length <= 1) {
    return paragraphs[0] ? <p>{storyFullText(paragraphs[0])}</p> : null;
  }

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus({ preventScroll: true });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="group block w-full text-left"
      >
        {storyFullText(paragraphs[0])}{" "}
        <span className="font-semibold text-neutral-900 underline decoration-neutral-400 underline-offset-4 group-hover:decoration-current dark:text-white dark:decoration-neutral-600">
          Read more
        </span>
      </button>
      <StoryModal open={open} onClose={close} paragraphs={paragraphs} />
    </>
  );
}

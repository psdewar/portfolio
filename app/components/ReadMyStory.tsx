"use client";

import type { StoryParagraph } from "../data/story";
import { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { ModalShell } from "./SupportModal";
import StoryParagraphs from "./StoryParagraphs";
import { useBackToClose } from "../lib/useBackToClose";

const STORY_FONT =
  "!font-[family-name:var(--font-epunda)] !text-[20px] !font-semibold !leading-[1.5] !tracking-normal";

const STORY_PANEL = [
  "px-6 pt-6 pb-6",
  "[@media(max-width:639px)]:!h-[100dvh] [@media(max-width:639px)]:!max-h-none [@media(max-width:639px)]:!max-w-none [@media(max-width:639px)]:[overscroll-behavior-y:contain] [@media(max-width:639px)]:!rounded-none [@media(max-width:639px)]:!shadow-none",
  "[@media(max-width:639px)]:!pt-[calc(1.5rem+env(safe-area-inset-top))] [@media(max-width:639px)]:!pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
].join(" ");

const STORY_CLOSE_WRAPPER =
  "contents [@media(max-width:639px)]:!block [@media(max-width:639px)]:sticky [@media(max-width:639px)]:top-[calc(-1.5rem-env(safe-area-inset-top))] [@media(max-width:639px)]:z-20 [@media(max-width:639px)]:h-0 [@media(max-width:639px)]:-mx-6 [@media(max-width:639px)]:-mt-[calc(1.5rem+env(safe-area-inset-top))] [@media(max-width:639px)]:mb-[calc(1.5rem+env(safe-area-inset-top))] [@media(max-width:639px)]:[&>button]:!top-[max(1rem,env(safe-area-inset-top))]";

type StoryTone = "neutral" | "ink";

const STORY_TONES: Record<StoryTone, { button: string }> = {
  neutral: {
    button:
      "w-full min-h-[54px] rounded-btn border-2 border-neutral-900 dark:border-white bg-transparent text-neutral-900 dark:text-white hover:bg-neutral-900/[0.05] dark:hover:bg-white/[0.08] active:bg-neutral-900/[0.05] dark:active:bg-white/[0.08] transition-colors",
  },
  ink: {
    button:
      "block min-h-[var(--ck-control-h)] w-[calc(100%-2*var(--gut))] mx-[var(--gut)] px-2 bg-transparent border-2 border-[#f4f1ea] rounded-btn text-[#f4f1ea] text-center active:bg-[rgba(244,241,234,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4f1ea]",
  },
};

function StoryBody({ paragraphs, onDone }: { paragraphs: StoryParagraph[]; onDone: () => void }) {
  const headword = paragraphs[0]?.headword;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  useEffect(() => headingRef.current?.focus({ preventScroll: true }), []);
  useEffect(() => {
    const done = doneRef.current;
    if (!done) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        posthog.capture("story_finished");
        observer.disconnect();
      },
      { root: done.closest("[role=dialog]"), threshold: 0.5 },
    );
    observer.observe(done);
    return () => observer.disconnect();
  }, []);
  return (
    <>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="pr-12 text-[34px] font-semibold leading-[1.1] tracking-[-0.01em] text-neutral-900 outline-none dark:text-neutral-100"
      >
        {headword?.name ?? "My story"}
      </h2>
      {headword && (
        <p className="mt-1.5 text-base leading-relaxed italic text-neutral-700 dark:text-neutral-300">
          {headword.pronunciation}
        </p>
      )}
      <div className="mt-3 space-y-4 text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
        <StoryParagraphs paragraphs={paragraphs} />
      </div>
      <button
        ref={doneRef}
        type="button"
        onClick={onDone}
        className={`mt-8 cursor-pointer ${STORY_FONT} ${STORY_TONES.neutral.button}`}
      >
        Done reading
      </button>
    </>
  );
}

export function ReadMyStory({
  paragraphs,
  tone = "neutral",
}: {
  paragraphs: StoryParagraph[];
  tone?: StoryTone;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const t = STORY_TONES[tone];
  useBackToClose(open, () => setOpen(false));

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus({ preventScroll: true });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`cursor-pointer ${STORY_FONT} ${t.button}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        Read my story
      </button>
      <ModalShell
        open={open}
        onClose={close}
        ariaLabel="Peyt Spencer"
        layerClassName="z-[60] [@media(max-width:639px)]:!p-0"
        panelClassName={STORY_PANEL}
        closeWrapperClassName={STORY_CLOSE_WRAPPER}
        swipeToClose
      >
        <StoryBody paragraphs={paragraphs} onDone={close} />
      </ModalShell>
    </>
  );
}

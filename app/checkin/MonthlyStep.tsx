"use client";

import type { StoryParagraph } from "../data/story";
import { ReadMyStory } from "../components/ReadMyStory";
import { MONTHLY_PITCH, TierPicker } from "../components/SupportModal";
import { EARLY_ACCESS_PREVIEW } from "../data/supporter-config";
import { useRef } from "react";
import { Chev, DoneText, useRowMotion } from "./RoadParts";

const LABEL = "Be my monthly supporter";

export default function MonthlyStep({
  done,
  linked,
  checkinId,
  storyParagraphs,
  onDone,
  open,
  onToggle,
}: {
  done: boolean;
  linked: boolean;
  checkinId: string | null;
  storyParagraphs: StoryParagraph[];
  onDone: () => void;
  open: boolean;
  onToggle: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  useRowMotion(rootRef, open);
  return (
    <div
      ref={rootRef}
      className={`fin${open ? " open" : ""}${linked ? " linked" : ""}`}
      data-n="7"
      id="st-7"
      data-scheme="dark"
    >
      <button
        type="button"
        className="fin-head"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="t">
          <span className="fin-title">{LABEL}</span>
        </span>
        <DoneText done={done} />
        <Chev />
      </button>
      <div hidden={!open}>
        <p className="fin-sub">{MONTHLY_PITCH}</p>
        <div className="fin-tiers">
          <TierPicker
            source="checkin"
            preview={EARLY_ACCESS_PREVIEW}
            preloadAudio="none"
            checkinId={checkinId}
            onCheckoutComplete={onDone}
            tone="ink"
          />
          <ReadMyStory paragraphs={storyParagraphs} tone="ink" />
        </div>
      </div>
    </div>
  );
}

"use client";

import type { StoryParagraph } from "../data/story";
import { ReadMyStory } from "../components/ReadMyStory";
import { MONTHLY_PITCH, TierPicker } from "../components/SupportModal";
import { EARLY_ACCESS_PREVIEW } from "../data/supporter-config";
import { Lead, NoteIcon } from "./RoadParts";

const LABEL = "Be my monthly supporter";

export default function MonthlyStep({
  done,
  linked,
  checkinId,
  storyParagraphs,
  onDone,
}: {
  done: boolean;
  linked: boolean;
  checkinId: string | null;
  storyParagraphs: StoryParagraph[];
  onDone: () => void;
}) {
  return (
    <div className={`fin${linked ? " linked" : ""}`} data-n="6" id="st-6" data-scheme="dark">
      <div className="fin-head">
        <Lead done={done} pop mark={done}>
          <span className="tiptile gold" aria-hidden="true">
            <NoteIcon />
          </span>
        </Lead>
        <span className="t">
          <span className="fin-title">{LABEL}</span>
        </span>
      </div>
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
  );
}

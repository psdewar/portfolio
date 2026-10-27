"use client";

import type { StoryParagraph } from "../data/story";
import { ReadMyStory } from "../components/ReadMyStory";
import { MONTHLY_PITCH, TierPicker } from "../components/SupportModal";
import { EARLY_ACCESS_PREVIEW } from "../data/supporter-config";
import { RecordArt } from "./RowArt";
import { Lead, StepShell } from "./RoadParts";

export default function MonthlyStep({
  n,
  done,
  linked,
  checkinId,
  storyParagraphs,
  onDone,
  open,
  onToggle,
}: {
  n: number;
  done: boolean;
  linked: boolean;
  checkinId: string | null;
  storyParagraphs: StoryParagraph[];
  onDone: () => void;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <StepShell
      n={n}
      id={`st-${n}`}
      done={done}
      open={open}
      linked={linked}
      onToggle={onToggle}
      lead={
        <Lead done={done} pop>
          <RecordArt />
        </Lead>
      }
      title="Be my monthly supporter"
    >
      <div className="mbody">
        <p className="mpitch">{MONTHLY_PITCH}</p>
        <TierPicker
          source="checkin"
          preview={EARLY_ACCESS_PREVIEW}
          preloadAudio="none"
          showImage={false}
          checkinId={checkinId}
          onCheckoutComplete={onDone}
          tone="paper"
        />
        <ReadMyStory paragraphs={storyParagraphs} tone="paper" />
      </div>
    </StepShell>
  );
}

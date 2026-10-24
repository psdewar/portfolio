"use client";

import SocialButtons, { type SocialTarget } from "../components/SocialButtons";
import { Lead, StepShell } from "./RoadParts";
import { SocialsArt } from "./RowArt";

export type { SocialTarget };

export default function SocialsStep({
  open,
  linked,
  onToggle,
  done,
  onTap,
}: {
  open: boolean;
  linked: boolean;
  onToggle: () => void;
  done: boolean;
  onTap: (target: SocialTarget) => void;
}) {
  return (
    <StepShell
      n={3}
      id="st-3"
      done={done}
      open={open}
      linked={linked}
      onToggle={onToggle}
      lead={
        <Lead done={done} pop>
          <SocialsArt />
        </Lead>
      }
      title="Find me on socials"
      sub={open ? "Come back when you're done" : undefined}
    >
      <SocialButtons showAppleMusic onTap={onTap} />
    </StepShell>
  );
}

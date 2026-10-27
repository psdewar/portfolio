"use client";

import { useEffect, useRef, useState } from "react";
import "../components/SocialButtons.css";
import type { SocialTarget } from "../components/SocialButtons";
import { INSTAGRAM_URL } from "../lib/socials";
import { IgGradient, InstagramGlyph } from "./BrandGlyphs";
import { Lead, Mark, StepShell } from "./RoadParts";
import { InstagramArt } from "./RowArt";

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
  const [copied, setCopied] = useState(false);
  const [copiedOnce, setCopiedOnce] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = () => {
    onTap("copy_caption" as SocialTarget);
    navigator.clipboard?.writeText("@peytspencer #FromTheGroundUp2026");
    setCopied(true);
    setCopiedOnce(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

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
          <InstagramArt />
        </Lead>
      }
      title="Post your best photo"
    >
      <div className="soc stp">
        <IgGradient />
        <span className={`stn${copiedOnce ? " ok" : ""}`}>{copiedOnce ? <Mark done pop /> : 1}</span>
        <button type="button" className="soc-btn" onClick={copy}>
          <span className="tx">
            <b>
              @peytspencer <span className="nb">#FromTheGroundUp2026</span>
            </b>
          </span>
          <span className="cp-a">{copied ? "Copied" : "Copy"}</span>
        </button>
        <span className="stn">2</span>
        <a className="soc-btn" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" onClick={() => onTap("instagram")}>
          <InstagramGlyph />
          <span className="tx">
            <b>Open Instagram</b>
          </span>
        </a>
        <span className="stn">3</span>
        <span className="stt">Paste the tag into your caption</span>
      </div>
    </StepShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Lead, StepShell } from "./RoadParts";
import { detectDevice, resolveDevice, type Device } from "./platform";

type Platform = "ios" | "pixel" | "samsung";

const LABELS: Record<Platform, { from: string; to: string }> = {
  ios: { from: "HD", to: "4K" },
  samsung: { from: "FHD", to: "UHD" },
  pixel: { from: "1080p", to: "4K" },
};

const toPlatform = (d: Device): Platform => (d === "desktop" ? "ios" : d);

export default function TipRow({ linked }: { linked: boolean }) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("ios");
  useEffect(() => {
    let live = true;
    setPlatform(toPlatform(detectDevice()));
    resolveDevice().then((d) => live && setPlatform(toPlatform(d)));
    return () => {
      live = false;
    };
  }, []);
  const { from, to } = LABELS[platform];
  const steps = [
    "Open Camera and switch to Video.",
    `Find the label that says ${from}. Tap it until it says ${to}.`,
    "Can\u2019t find it? Film anyway. Every angle helps.",
  ];

  return (
    <StepShell
      stop
      open={open}
      linked={linked}
      onToggle={() => setOpen((o) => !o)}
      lead={
        <Lead mark={false}>
          <span className="tiptile" aria-hidden="true">
            <svg viewBox="0 0 24 24" {...{ fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}>
              <rect x="2" y="6" width="13" height="12" rx="2.5" />
              <path d="M15 10.5l6-3.5v10l-6-3.5" />
            </svg>
          </span>
        </Lead>
      }
      title="Filming tonight?"
      sub="Turn up your video quality first."
    >
      <div className="tipbody" role="region" aria-label="Filming tips">
        <span className="tfig">
          <span className="tpair" aria-hidden="true">
            <span className="tpill">{from}</span>
            <svg viewBox="0 0 24 24" className="tarrow" {...{ fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" }}>
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
            <span className="tpill on">{to}</span>
          </span>
          <span className="figcap">
            <span role="list" aria-label="Steps">
              {steps.map((line) => (
                <span key={line} role="listitem">
                  {line}
                </span>
              ))}
            </span>
          </span>
        </span>
      </div>
    </StepShell>
  );
}

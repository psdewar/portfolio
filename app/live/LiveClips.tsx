"use client";

import type { RefObject } from "react";
import { ENERGY_VIDEO_IDS } from "../lib/videos.config";
import EnergyVideos, { type EnergyVideosHandle } from "../components/EnergyVideos";

export interface EnergyClipHandlers {
  energyVideosRef: RefObject<EnergyVideosHandle>;
  onLoudStart: () => void;
  onLoudEnd: () => void;
}

export function LiveClips({
  active,
  energyVideosRef,
  onLoudStart,
  onLoudEnd,
  fitHeight,
  flush,
  inset,
  underLeft,
  className,
}: EnergyClipHandlers & {
  active: boolean;
  fitHeight?: boolean;
  flush?: boolean;
  inset?: number;
  underLeft?: boolean;
  className?: string;
}) {
  return (
    <EnergyVideos
      ref={active ? energyVideosRef : undefined}
      videoIds={ENERGY_VIDEO_IDS}
      fitHeight={fitHeight}
      flush={flush}
      inset={inset}
      underLeft={underLeft}
      expandOnPlay
      className={className}
      onLoudPlay={onLoudStart}
      onLoudEnd={onLoudEnd}
    />
  );
}

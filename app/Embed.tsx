"use client";
import { memo } from "react";
import { InstagramEmbed } from "react-social-media-embed";
import { useHydrated } from "./hooks/useHydrated";

function EmbedLillardUnmemoized() {
  const hydrated = useHydrated();
  return hydrated ? (
    <div className="grid md:grid-cols-2 grid-cols-1">
      <InstagramEmbed url={"https://www.instagram.com/p/BMcAacTg3-0"} />
      <InstagramEmbed url={"https://www.instagram.com/p/BJlaUVIBhWM"} />
    </div>
  ) : null;
}

export const EmbedLillard = memo(EmbedLillardUnmemoized);

function EmbedTroglodyteUnmemoized() {
  const hydrated = useHydrated();
  return hydrated ? (
    <div className="grid grid-cols-1 md:place-items-center">
      <InstagramEmbed captioned url={"https://www.instagram.com/p/DKAtDTHTI_A"} />
    </div>
  ) : null;
}

export const EmbedTroglodyte = memo(EmbedTroglodyteUnmemoized);

"use client";
import { memo, useEffect, useState } from "react";
import { InstagramEmbed } from "react-social-media-embed";

function EmbedLillardUnmemoized() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return isClient ? (
    <div className="grid md:grid-cols-2 grid-cols-1">
      <InstagramEmbed url={"https://www.instagram.com/p/BMcAacTg3-0"} />
      <InstagramEmbed url={"https://www.instagram.com/p/BJlaUVIBhWM"} />
      {/* <InstagramEmbed url={"https://www.instagram.com/p/BZEN1Sgjvhs"} /> */}
    </div>
  ) : null;
}

export const EmbedLillard = memo(EmbedLillardUnmemoized);

export function EmbedTroglodyteUnmemoized() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return isClient ? (
    <div className="grid grid-cols-1 md:place-items-center">
      <InstagramEmbed captioned url={"https://www.instagram.com/p/DKAtDTHTI_A"} />
    </div>
  ) : null;
}

export const EmbedTroglodyte = memo(EmbedTroglodyteUnmemoized);

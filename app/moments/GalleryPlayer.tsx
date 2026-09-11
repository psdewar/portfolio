"use client";

import { useState } from "react";
import MomentsGallery from "./MomentsGallery";
import MomentsPlayer from "./MomentsPlayer";
import type { GalleryItem } from "../api/shared/moments";

export default function GalleryPlayer({
  items,
  og = false,
}: {
  items: GalleryItem[];
  og?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  if (og) return <MomentsGallery items={items} og />;

  const openPlayer = () => setOpen(true);

  return (
    <>
      <MomentsGallery items={items} onCarClick={openPlayer} playerOpen={open} playing={playing} />
      <div
        className="mx-[calc(50%-50vw)] grid w-screen transition-[grid-template-rows] duration-300 ease-out sm:mx-0 sm:w-auto"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        inert={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="sm:py-6">{open && <MomentsPlayer autoplay onPlayingChange={setPlaying} />}</div>
        </div>
      </div>
    </>
  );
}

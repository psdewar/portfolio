"use client";

import { useEffect, useRef, useState } from "react";

export default function PosterScrollOverlay({
  note,
  inPromo = true,
}: {
  note?: string;
  inPromo?: boolean;
}) {
  const textRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const top = el.getBoundingClientRect().top;
      const t = (vh - top) / (vh * 0.55);
      setProgress(Math.min(Math.max(t, 0), 1));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-10 flex items-end p-6"
      style={{ backgroundColor: `rgba(0,0,0,${progress * 0.6})` }}
    >
      <div ref={textRef} style={{ opacity: progress }}>
        <p className="text-white text-base leading-relaxed font-medium">
          No RSVPs{note ? `: ${note}` : ""}
        </p>
        {inPromo && (
          <p className="text-white/80 text-base leading-relaxed mt-1">
            Date and location still included in promotional materials
          </p>
        )}
      </div>
    </div>
  );
}

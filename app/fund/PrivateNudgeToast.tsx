"use client";

import { useEffect, useState } from "react";

export default function PrivateNudgeToast({ destination }: { destination: string }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("nudge")) {
      url.searchParams.delete("nudge");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-neutral-950/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 bg-neutral-950"
        style={{ border: "1px solid rgba(212,165,83,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-300 transition-colors text-xl leading-none"
        >
          ×
        </button>
        <p className="text-neutral-300 text-sm">
          <span className="text-[#d4a553] font-semibold">Thanks.</span> No posters or public RSVPs.
          Also, I&apos;ll be in {destination} soon. If you know anyone, connect me!
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { PlayIcon, PauseIcon, XIcon } from "@phosphor-icons/react";

function IntroVideoModal({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCloseRef = useRef(onClose);
  const [loading, setLoading] = useState(true);

  onCloseRef.current = onClose;

  useEffect(() => {
    const video = videoRef.current;

    const stopPlayback = () => {
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    };

    const handleHidden = () => {
      if (document.hidden) {
        stopPlayback();
        onCloseRef.current();
      }
    };

    const handlePageHide = () => {
      stopPlayback();
      onCloseRef.current();
    };

    document.addEventListener("visibilitychange", handleHidden);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleHidden);
      window.removeEventListener("pagehide", handlePageHide);
      if (video) {
        video.pause();
        video.currentTime = 0;
        video.removeAttribute("src");
        video.load();
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full aspect-[9/16] bg-black rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-white/80 hover:text-white transition-colors"
        >
          <XIcon size={24} weight="bold" />
        </button>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <video
          ref={videoRef}
          src="https://assets.peytspencer.com/videos/concert-ftgu-intro-2-15sec.mp4"
          className="w-full h-full object-cover"
          controls
          autoPlay
          playsInline
          preload="metadata"
          onCanPlay={() => setLoading(false)}
          onEnded={onClose}
        />
      </div>
    </div>
  );
}

export default function SponsorAvatar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const autoOpen = searchParams.get("intro") === "1";
  const [playing, setPlaying] = useState(autoOpen);

  const handlePlay = () => setPlaying(true);

  const handleClose = () => {
    setPlaying(false);
    if (searchParams.get("intro") === "1") {
      router.replace(pathname);
    }
  };

  return (
    <div className="flex-shrink-0 w-[80px] sm:w-[112px] lg:w-[132px] rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900 group">
      <div className="aspect-square relative cursor-pointer" onClick={handlePlay}>
        <Image
          src="/images/home/bio.jpeg"
          alt="Peyt Spencer"
          fill
          className="object-cover"
          sizes="192px"
          priority
          quality={95}
        />
      </div>
      <button
        onClick={playing ? handleClose : handlePlay}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors cursor-pointer"
      >
        {playing ? <PauseIcon size={12} weight="fill" /> : <PlayIcon size={12} weight="fill" />}
        {playing ? "Close" : "Watch intro"}
      </button>

      {playing && <IntroVideoModal onClose={handleClose} />}
    </div>
  );
}

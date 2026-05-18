"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CopyrightIcon,
  PauseIcon,
  PlayIcon,
  ShareFatIcon,
  WaveformIcon,
} from "@phosphor-icons/react";
import { useAudio } from "app/contexts/AudioContext";
import {
  TRACK_DATA,
  STREAMING_PLATFORM_LABELS,
  type StreamingPlatform,
} from "app/data/tracks";
import { isPatronTrack } from "app/data/patron-config";
import { usePatronStatus } from "app/hooks/usePatronStatus";
import { getLyrics, getCurrentLyric } from "app/lib/lyrics";

const PLATFORM_ICONS: Partial<Record<StreamingPlatform, string>> = {
  spotify: "/icons/streaming/spotify.webp",
  appleMusic: "/icons/streaming/apple-music.webp",
  itunes: "/icons/streaming/itunes.webp",
  deezer: "/icons/streaming/deezer.webp",
  iheartradio: "/icons/streaming/iheartradio.webp",
};

const PlatformTile = ({ platform }: { platform: StreamingPlatform }) => {
  const url = PLATFORM_ICONS[platform];
  if (!url) return <span className="w-12 h-12 bg-neutral-800 shrink-0" />;
  return (
    <span className="relative w-12 h-12 shrink-0 bg-black">
      <Image src={url} alt="" fill sizes="48px" className="object-contain" />
    </span>
  );
};

interface Props {
  trackId: string;
  coverSrc: string;
  href?: string;
  artworkPending?: boolean;
  prevCoverSrc?: string;
  nextCoverSrc?: string;
  prevArtworkPending?: boolean;
  nextArtworkPending?: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

const ROW_HOVER =
  "hover:bg-neutral-300 dark:hover:bg-neutral-700 active:bg-neutral-400 dark:active:bg-neutral-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 focus-visible:ring-inset";
const ICON_BTN = `w-12 h-12 flex items-center justify-center shrink-0 text-neutral-900 dark:text-white ${ROW_HOVER}`;

export default function SingleOverlay({
  trackId,
  coverSrc,
  href,
  artworkPending,
  prevCoverSrc,
  nextCoverSrc,
  prevArtworkPending,
  nextArtworkPending,
  onClose,
  onPrev,
  onNext,
}: Props) {
  const {
    loadTrack,
    currentTrack,
    isPlaying,
    isLoading,
    buffered,
    currentTime,
    duration,
    toggle,
    seekTo,
    formatTime,
    getLyricTime,
  } = useAudio();
  const isPatron = usePatronStatus();

  const trackData = TRACK_DATA.find((t) => t.id === trackId);
  const isCurrent = currentTrack?.id === trackId;
  const playing = isCurrent && isPlaying;
  const releaseYear = trackData?.releaseDate?.slice(0, 4);

  const isPatronOnly = isPatronTrack(trackId);
  const isHosted = (trackData?.source ?? "hosted") === "hosted";
  const state: "playable" | "patronGated" | "streamOnly" = !isHosted
    ? "streamOnly"
    : isPatronOnly && !isPatron
      ? "patronGated"
      : "playable";

  const lyricsData = getLyrics(trackId);
  const currentLine = getCurrentLyric(trackId, getLyricTime())?.text;
  const isLoadingCurrent = isLoading && isCurrent;

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);

  const coverRef = useRef<HTMLDivElement>(null);
  const isDraggingCover = useRef(false);
  const dragLocked = useRef(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragLockTimeRef = useRef(0);
  const frozenAdjacent = useRef<{ src: string; dir: "next" | "prev"; snapping: boolean; coverReady: boolean; artworkPending?: boolean } | null>(null);

  useEffect(() => {
    if (!frozenAdjacent.current) return;
    if (frozenAdjacent.current.snapping) {
      frozenAdjacent.current.coverReady = true;
    } else {
      frozenAdjacent.current = null;
    }
  }, [coverSrc]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    [prevCoverSrc, nextCoverSrc].forEach((src) => {
      if (!src) return;
      const img = new window.Image();
      img.src = src;
    });
  }, [prevCoverSrc, nextCoverSrc]);

  useEffect(
    () => () => {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    },
    [],
  );

  const coverTransition = isSnapping ? "transform 300ms ease-out" : "none";

  const frozen = frozenAdjacent.current;
  const leftSrc = frozen?.dir === "prev" ? frozen.src : prevCoverSrc;
  const rightSrc = frozen?.dir === "next" ? frozen.src : nextCoverSrc;
  const leftArtworkPending = frozen?.dir === "prev" ? frozen.artworkPending : prevArtworkPending;
  const rightArtworkPending = frozen?.dir === "next" ? frozen.artworkPending : nextArtworkPending;
  const displaySrc = dragX === 0 && frozen?.src ? frozen.src : coverSrc;
  const showPlaceholder = !displaySrc || !!artworkPending || (dragX === 0 && !!frozen?.artworkPending);

  const snapTo = useCallback((targetX: number, action?: () => void) => {
    if (frozenAdjacent.current) {
      frozenAdjacent.current.snapping = true;
      frozenAdjacent.current.coverReady = false;
    }
    setIsSnapping(true);
    setDragX(targetX);
    action?.();
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => {
      if (frozenAdjacent.current) {
        if (frozenAdjacent.current.coverReady) {
          frozenAdjacent.current = null;
        } else {
          frozenAdjacent.current.snapping = false;
        }
      }
      setDragX(0);
      setIsSnapping(false);
    }, 350);
  }, []);

  const triggerNext = useCallback(() => {
    if (!onNext || isSnapping) return;
    const w = coverRef.current?.clientWidth ?? 375;
    if (nextCoverSrc) frozenAdjacent.current = { src: nextCoverSrc, dir: "next", snapping: false, coverReady: false, artworkPending: nextArtworkPending };
    snapTo(-w, onNext);
  }, [onNext, nextCoverSrc, nextArtworkPending, isSnapping, snapTo]);

  const triggerPrev = useCallback(() => {
    if (!onPrev || isSnapping) return;
    const w = coverRef.current?.clientWidth ?? 375;
    if (prevCoverSrc) frozenAdjacent.current = { src: prevCoverSrc, dir: "prev", snapping: false, coverReady: false, artworkPending: prevArtworkPending };
    snapTo(w, onPrev);
  }, [onPrev, prevCoverSrc, prevArtworkPending, isSnapping, snapTo]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && onPrev) {
        e.preventDefault();
        triggerPrev();
      } else if (e.key === "ArrowRight" && onNext) {
        e.preventDefault();
        triggerNext();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onPrev, onNext, onClose, triggerPrev, triggerNext]);

  const handleShare = async () => {
    if (!trackData) return;
    const shareData = {
      title: `Peyt Spencer - ${trackData.title}`,
      text: `Listen to ${trackData.title} by Peyt Spencer`,
      url: `https://peytspencer.com/${trackId}`,
    };
    if (typeof navigator === "undefined") return;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
      }
    } catch {}
  };

  const handlePlayToggle = () => {
    if (isCurrent) {
      toggle();
      return;
    }
    if (!trackData) return;
    loadTrack(
      {
        id: trackData.id,
        title: trackData.title,
        artist: trackData.artist,
        src: trackData.audioUrl,
        thumbnail: trackData.thumbnail,
        duration: trackData.duration,
      },
      true,
    );
  };

  const onCoverPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isSnapping) return;
    isDraggingCover.current = true;
    dragLocked.current = false;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
  };

  const onCoverPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCover.current) return;
    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - dragStartY.current;

    if (!dragLocked.current) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        // Vertical — abort and let the browser handle pull-to-refresh / scroll
        isDraggingCover.current = false;
        return;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      dragLocked.current = true;
      dragLockTimeRef.current = performance.now();
    }

    const constrained =
      !onNext && dx < 0 ? Math.max(dx / 4, -40) :
      !onPrev && dx > 0 ? Math.min(dx / 4, 40) :
      dx;
    setDragX(constrained);
  };

  const onCoverPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCover.current) return;
    if (dragLocked.current) e.currentTarget.releasePointerCapture(e.pointerId);
    isDraggingCover.current = false;
    dragLocked.current = false;

    const absX = Math.abs(dragX);
    if (absX < 10) {
      if (state === "playable") handlePlayToggle();
      return;
    }

    const w = e.currentTarget.clientWidth;
    const elapsed = Math.max(1, performance.now() - dragLockTimeRef.current);
    const velocity = Math.abs(dragX) / elapsed;
    const isFlick = velocity > 0.3;

    if ((dragX < -w * 0.15 || (isFlick && dragX < 0)) && onNext) {
      if (nextCoverSrc) frozenAdjacent.current = { src: nextCoverSrc, dir: "next", snapping: false, coverReady: false, artworkPending: nextArtworkPending };
      snapTo(-w, onNext);
    } else if ((dragX > w * 0.15 || (isFlick && dragX > 0)) && onPrev) {
      if (prevCoverSrc) frozenAdjacent.current = { src: prevCoverSrc, dir: "prev", snapping: false, coverReady: false, artworkPending: prevArtworkPending };
      snapTo(w, onPrev);
    } else {
      snapTo(0);
    }
  };

  const onCoverPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCover.current) return;
    if (dragLocked.current) e.currentTarget.releasePointerCapture(e.pointerId);
    isDraggingCover.current = false;
    dragLocked.current = false;
    if (dragX !== 0) snapTo(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start bg-black/40 backdrop-blur-xl animate-fade-in overflow-y-auto md:justify-center md:p-4 md:pt-20"
      onClick={onClose}
    >
      <div
        className="relative w-full max-h-screen overflow-y-auto bg-white dark:bg-neutral-950 md:max-h-[calc(100vh-6rem)] md:max-w-md md:rounded-2xl md:shadow-[0_20px_80px_-20px_rgba(249,115,22,0.3)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Share"
          onClick={(e) => {
            e.stopPropagation();
            handleShare();
          }}
          className="fixed md:absolute right-4 z-40 w-12 h-12 md:w-11 md:h-11 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white/90 hover:text-orange-500 hover:bg-black/80 active:bg-black transition-colors cursor-pointer top-[max(1rem,calc(env(safe-area-inset-top,0px)+0.5rem))] md:top-4 before:absolute before:content-[''] before:-top-4 before:-right-4 before:-bottom-2 before:left-0"
        >
          <ShareFatIcon className="w-5 h-5" weight="bold" />
        </button>

        <div
          ref={coverRef}
          className="relative aspect-square w-full overflow-hidden"
          style={{ touchAction: "pan-y" }}
          onPointerDown={onCoverPointerDown}
          onPointerMove={onCoverPointerMove}
          onPointerUp={onCoverPointerUp}
          onPointerCancel={onCoverPointerCancel}
        >
          {(leftSrc || leftArtworkPending) && (
            leftArtworkPending ? (
              <div
                className="absolute inset-0 bg-neutral-900 flex items-center justify-center"
                style={{ transform: `translateX(calc(-100% + ${dragX}px))`, transition: coverTransition }}
              >
                <WaveformIcon size={96} weight="light" className="text-neutral-700" />
              </div>
            ) : (
              <img
                src={leftSrc}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover select-none"
                style={{ transform: `translateX(calc(-100% + ${dragX}px))`, transition: coverTransition }}
              />
            )
          )}
          {(rightSrc || rightArtworkPending) && (
            rightArtworkPending ? (
              <div
                className="absolute inset-0 bg-neutral-900 flex items-center justify-center"
                style={{ transform: `translateX(calc(100% + ${dragX}px))`, transition: coverTransition }}
              >
                <WaveformIcon size={96} weight="light" className="text-neutral-700" />
              </div>
            ) : (
              <img
                src={rightSrc}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover select-none"
                style={{ transform: `translateX(calc(100% + ${dragX}px))`, transition: coverTransition }}
              />
            )
          )}
          {showPlaceholder ? (
            <div
              className="absolute inset-0 bg-neutral-900 flex items-center justify-center"
              style={{
                transform: `translateX(${dragX}px)`,
                transition: coverTransition,
              }}
            >
              <WaveformIcon size={96} weight="light" className="text-neutral-700" />
            </div>
          ) : (
            <img
              src={displaySrc}
              alt={trackData ? `${trackData.artist} - ${trackData.title}` : ""}
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover select-none"
              style={{
                transform: `translateX(${dragX}px)`,
                transition: coverTransition,
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 pointer-events-none" />
          {artworkPending && (
            <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
              <span className="px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded text-[11px] text-white/80 uppercase tracking-wide">
                Early Listen
              </span>
            </div>
          )}
        </div>

        {state === "playable" ? (
          <div
            className={`px-4 ${
              isLoading && isCurrent ? "animate-pulse" : ""
            }`}
          >
            <button
              type="button"
              aria-label="Seek"
              onPointerDown={(e) => {
                if (!duration) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                setIsScrubbing(true);
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                seekTo(pct * duration);
              }}
              onPointerMove={(e) => {
                if (!isScrubbing || !duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                seekTo(pct * duration);
              }}
              onPointerUp={(e) => {
                e.currentTarget.releasePointerCapture(e.pointerId);
                setIsScrubbing(false);
              }}
              onPointerCancel={(e) => {
                e.currentTarget.releasePointerCapture(e.pointerId);
                setIsScrubbing(false);
              }}
              className="flex flex-col justify-center w-full h-12 cursor-pointer group/scrub touch-none"
            >
              <div className={`relative w-full bg-black/10 dark:bg-white/10 overflow-hidden transition-all rounded-full ${
                isScrubbing ? "h-3" : "h-1"
              }`}>
                <div
                  className="absolute inset-y-0 left-0 bg-black/15 dark:bg-white/25 rounded-full"
                  style={{ width: `${buffered * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full"
                  style={{
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-3 text-neutral-500 dark:text-white/55 text-[10px] leading-none mt-1.5">
                <span className="tabular-nums shrink-0">
                  {isCurrent && duration > 0 ? formatTime(currentTime || 0) : "0:00"}
                </span>
                {trackData?.label && (
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <CopyrightIcon className="w-3 h-3 shrink-0" weight="regular" />
                    <span className="truncate">
                      <span className="tabular-nums">{releaseYear}</span> {trackData.label}
                    </span>
                  </span>
                )}
                <span className="tabular-nums shrink-0">
                  {formatTime(trackData?.duration ?? 0)}
                </span>
              </div>
            </button>
          </div>
        ) : (
          <Link
            href="/support#supporter"
            className="relative block overflow-hidden bg-neutral-100 dark:bg-neutral-950 transition-colors group"
          >
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
            <div className="relative flex items-center px-4 h-12">
              {(releaseYear || trackData?.label) && (
                <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 dark:text-white/55 group-hover:text-white/70 transition-colors min-w-0 shrink">
                  <CopyrightIcon className="w-3 h-3 shrink-0" weight="regular" />
                  <span className="truncate"><span className="tabular-nums">{releaseYear}</span> {trackData?.label}</span>
                </span>
              )}
              <span className="ml-auto shrink-0 inline-flex items-center gap-2 whitespace-nowrap">
                <span className="font-bebas text-2xl leading-none text-neutral-900 dark:text-white group-hover:text-white transition-colors">
                  Become a Monthly{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500 group-hover:text-white">
                    Supporter
                  </span>
                </span>
                <CaretRightIcon
                  className="w-4 h-4 text-neutral-900 dark:text-white group-hover:text-white group-hover:translate-x-0.5 transition-all"
                  weight="bold"
                />
              </span>
            </div>
          </Link>
        )}

        <div className="sticky bottom-0 flex items-stretch w-full bg-neutral-200 dark:bg-neutral-800 z-10">
          <button
            type="button"
            onClick={handlePlayToggle}
            disabled={state !== "playable"}
            aria-label={
              state !== "playable"
                ? "Not playable in app"
                : playing || (isLoading && isCurrent)
                  ? "Pause"
                  : "Play"
            }
            className={`${ICON_BTN} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {playing || (isLoading && isCurrent) ? (
              <PauseIcon size={20} weight="fill" />
            ) : (
              <PlayIcon size={22} weight="fill" className="ml-px" />
            )}
          </button>
          <div className="flex-1 flex items-center px-4 min-w-0 h-12 border-x border-neutral-300 dark:border-neutral-700">
            {currentLine ? (
              <p className="w-full text-left text-[15px] font-medium text-neutral-800 dark:text-white/85 line-clamp-2 leading-snug">
                {currentLine}
              </p>
            ) : state === "playable" && lyricsData ? (
              <p
                className={`w-full text-left text-[15px] font-medium leading-tight ${
                  isLoadingCurrent
                    ? "text-neutral-500 dark:text-white/40 animate-pulse italic"
                    : isCurrent
                      ? "text-neutral-600 dark:text-white/55"
                      : "text-neutral-600 dark:text-white/55 italic"
                }`}
              >
                Read lyrics here...
              </p>
            ) : trackData?.title ? (
              <p className="w-full text-left text-[15px] font-medium text-neutral-800 dark:text-white/85 truncate">
                {trackData.title}
              </p>
            ) : null}
          </div>
          {onPrev && (
            <button
              type="button"
              onClick={triggerPrev}
              aria-label="Previous track"
              className={ICON_BTN}
            >
              <CaretLeftIcon className="w-5 h-5" weight="bold" />
            </button>
          )}
          {onNext && (
            <button
              type="button"
              onClick={triggerNext}
              aria-label="Next track"
              className={ICON_BTN}
            >
              <CaretRightIcon className="w-5 h-5" weight="bold" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Minimize"
            className={ICON_BTN}
          >
            <CaretDownIcon className="w-5 h-5" weight="bold" />
          </button>
        </div>

        {trackData?.streamingLinks?.length ? (
          <div className="flex flex-col">
            {trackData.streamingLinks.map((link, i) => (
              <Link
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ animationDelay: `${i * 45}ms` }}
                className="group/link flex items-stretch animate-streaming-in"
              >
                <PlatformTile platform={link.platform} />
                <span className="flex-1 flex items-center justify-between gap-2 px-4 bg-neutral-100 dark:bg-neutral-900 group-hover/link:bg-neutral-200 dark:group-hover/link:bg-neutral-800 transition-colors">
                  <span className="text-neutral-900 dark:text-white text-[15px] font-medium tracking-wide">
                    {STREAMING_PLATFORM_LABELS[link.platform]}
                  </span>
                  <CaretRightIcon
                    className="w-4 h-4 -mr-1 text-neutral-400 dark:text-neutral-500 group-hover/link:text-orange-500 group-hover/link:translate-x-0.5 transition-all"
                    weight="bold"
                  />
                </span>
              </Link>
            ))}
          </div>
        ) : href ? (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bebas text-2xl tracking-wider transition-colors"
          >
            STREAM
            <CaretRightIcon className="w-5 h-5" weight="bold" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

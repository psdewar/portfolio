"use client";

import { useEffect, useRef, useState } from "react";
import {
  MusicNoteIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "@phosphor-icons/react";
import posthog from "posthog-js";
import { TRACK_DATA, type TrackData } from "../data/tracks";
import { isPatronTrack } from "../data/patron-config";
import { useAudio } from "../contexts/AudioContext";

const PLAYLIST: TrackData[] = TRACK_DATA.filter(
  (t) => (t.source ?? "hosted") === "hosted" && !isPatronTrack(t.id),
);

const START_INDEX = Math.max(
  0,
  PLAYLIST.findIndex((t) => t.id === "patience"),
);

const LISTEN_AT = 10.43;

const controlClass =
  "flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors active:bg-white/15 [@media(hover:hover)]:hover:bg-white/10";

export default function MomentsPlayer({
  autoplay = false,
  onPlayingChange,
}: {
  autoplay?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const { pause: pauseGlobal, isPlaying: globalIsPlaying } = useAudio();
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const wasGlobalPlaying = useRef(globalIsPlaying);
  const [index, setIndex] = useState(START_INDEX);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(PLAYLIST[START_INDEX].duration ?? 0);

  const track = PLAYLIST[index];
  const ratio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  useEffect(() => {
    onPlayingChangeRef.current = onPlayingChange;
  }, [onPlayingChange]);

  useEffect(() => {
    if (!autoplay) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = `${PLAYLIST[START_INDEX].audioUrl}#t=${LISTEN_AT}`;
    setCurrentTime(LISTEN_AT);
    pauseGlobal();
    posthog.capture("moments_track_play", { track: PLAYLIST[START_INDEX].id });
    audio.play().catch(() => {});
    setIsPlaying(true);
  }, [autoplay, pauseGlobal]);

  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      onPlayingChangeRef.current?.(false);
    };
  }, []);

  useEffect(() => {
    const started = globalIsPlaying && !wasGlobalPlaying.current;
    wasGlobalPlaying.current = globalIsPlaying;
    if (started) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [globalIsPlaying]);

  function changeTrack(nextIndex: number, keepPlaying: boolean) {
    const nextTrack = PLAYLIST[nextIndex];
    setIndex(nextIndex);
    setCurrentTime(0);
    setDuration(nextTrack.duration ?? 0);
    const audio = audioRef.current;
    if (!audio || !audio.src) {
      setIsPlaying(false);
      return;
    }
    audio.src = nextTrack.audioUrl;
    audio.currentTime = 0;
    if (keepPlaying) {
      pauseGlobal();
      posthog.capture("moments_track_play", { track: nextTrack.id });
      audio.play().catch(() => {});
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    if (!audio.src) audio.src = track.audioUrl;
    pauseGlobal();
    posthog.capture("moments_track_play", { track: track.id });
    audio.play().catch(() => {});
    setIsPlaying(true);
  }

  function skipBack() {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    changeTrack((index - 1 + PLAYLIST.length) % PLAYLIST.length, isPlaying);
  }

  function skipForward() {
    changeTrack((index + 1) % PLAYLIST.length, isPlaying);
  }

  function handleEnded() {
    changeTrack((index + 1) % PLAYLIST.length, true);
  }

  function syncDuration(e: React.SyntheticEvent<HTMLAudioElement>) {
    const d = e.currentTarget.duration;
    setDuration(Number.isFinite(d) ? d : (track.duration ?? 0));
  }

  function seek(e: React.PointerEvent<HTMLDivElement>) {
    const el = trackRef.current;
    if (!el || duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const nextRatio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const target = nextRatio * duration;
    setCurrentTime(target);
    const audio = audioRef.current;
    if (audio && audio.src) audio.currentTime = target;
  }

  return (
    <div
      className="w-full overflow-hidden border-y border-white/10 text-white backdrop-blur sm:mx-auto sm:max-w-lg sm:border"
      style={{ backgroundColor: "rgba(44,46,50,0.9)" }}
    >
      <audio
        ref={audioRef}
        preload="none"
        hidden
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={syncDuration}
        onDurationChange={syncDuration}
        onEnded={handleEnded}
      />

      <div className="flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={track.thumbnail}
          alt=""
          loading="lazy"
          className="h-20 w-20 shrink-0 object-cover sm:h-24 sm:w-24"
        />
        <div className="flex min-w-0 flex-1 flex-col pl-4 pr-4 pt-2 sm:pl-5 sm:pr-5 sm:pt-3">
          <p className="truncate text-lg font-medium tracking-tight sm:text-xl">{track.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/75 sm:text-base">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-white/30">
              <MusicNoteIcon size={11} weight="fill" />
            </span>
            <span className="truncate">{track.artist}</span>
          </p>
          <div onPointerDown={seek} className="relative mt-auto h-6 cursor-pointer sm:h-7">
            <div
              ref={trackRef}
              className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-white/25"
            >
              <div className="h-full rounded-full bg-white" style={{ width: `${ratio * 100}%` }} />
              <div
                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                style={{ left: `${ratio * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-around px-5 py-1 sm:py-2">
        <button
          type="button"
          onClick={skipBack}
          aria-label="Previous"
          className={controlClass}
        >
          <SkipBackIcon size={26} weight="fill" />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className={controlClass}
        >
          {isPlaying ? <PauseIcon size={32} weight="fill" /> : <PlayIcon size={32} weight="fill" />}
        </button>
        <button
          type="button"
          onClick={skipForward}
          aria-label="Next"
          className={controlClass}
        >
          <SkipForwardIcon size={26} weight="fill" />
        </button>
      </div>
    </div>
  );
}

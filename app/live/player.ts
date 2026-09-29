"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { PostHog } from "posthog-js";
import Hls from "hls.js";
import { connectWhep, WhepNotLiveError, type WhepSession } from "../lib/whep";
import type { StreamPath } from "../lib/live";

const HLS_PART_DURATION_S = 0.2;
const HLS_LIVE_SYNC_DURATION_S = HLS_PART_DURATION_S * 3;
const HLS_LIVE_SYNC_DURATION_COUNT = 3;

const STATS_POLL_MS = 2000;
const FREEZE_STALL_POLLS = 2;
const FREEZE_RECOVERY_CAP = 2;
const WHEP_RETRY_BASE_MS = 1000;
const WHEP_RETRY_MAX_MS = 10000;
const WHEP_BACKGROUND_RETRY_MS = 30000;
const HLS_STALL_MS = 4000;

type PlayerPath = "whep" | "hls" | "native" | "none";

interface UsePlayerParams {
  isLive: boolean;
  isDemo: boolean;
  path: StreamPath;
  whepUrl: string;
  hlsUrl: string;
  posthog: PostHog | undefined;
}

export interface UsePlayerResult {
  videoRef: RefObject<HTMLVideoElement>;
  needsPlayButton: boolean;
  isMuted: boolean;
  needsResume: boolean;
  videoAspect: number | null;
  handleManualPlay: () => void;
  handleUnmute: () => void;
  handleResume: () => void;
  setMuted: (muted: boolean) => void;
}

function createHiddenVideo(): HTMLVideoElement | null {
  if (typeof document === "undefined") return null;
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.setAttribute("playsinline", "true");
  return v;
}

export function usePlayer({ isLive, isDemo, path, whepUrl, hlsUrl, posthog }: UsePlayerParams): UsePlayerResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);
  const [needsPlayButton, setNeedsPlayButton] = useState(true);
  const [isMuted, setIsMutedState] = useState(true);
  const [needsResume, setNeedsResume] = useState(false);
  const [videoAspect, setVideoAspect] = useState<number | null>(null);

  const posthogRef = useRef(posthog);
  posthogRef.current = posthog;
  const needsPlayButtonRef = useRef(needsPlayButton);
  useEffect(() => {
    needsPlayButtonRef.current = needsPlayButton;
  }, [needsPlayButton]);

  const setMuted = (muted: boolean) => {
    const video = videoRef.current;
    if (video) video.muted = muted;
    setIsMutedState(muted);
  };

  useEffect(() => {
    if (!isLive || isDemo) return;

    let disposed = false;
    let waitFrame: number | null = null;
    let teardownStart: (() => void) | null = null;

    const waitForVideo = () => {
      if (disposed) return;
      const video = videoRef.current;
      if (!video) {
        waitFrame = requestAnimationFrame(waitForVideo);
        return;
      }
      teardownStart = start(video);
    };
    waitForVideo();

    return () => {
      disposed = true;
      if (waitFrame !== null) cancelAnimationFrame(waitFrame);
      teardownStart?.();
    };

    function start(video: HTMLVideoElement): () => void {
    let disposed = false;
    const getVideo = () => videoRef.current;
    let mode: PlayerPath = "none";
    let session: WhepSession | null = null;
    let hls: Hls | null = null;
    let whepStatsInterval: ReturnType<typeof setInterval> | null = null;
    let hlsHealthInterval: ReturnType<typeof setInterval> | null = null;
    let hlsHealthTimeUpdate: (() => void) | null = null;
    let hlsHealthVideo: HTMLVideoElement | null = null;
    let backgroundRetryInterval: ReturnType<typeof setInterval> | null = null;
    let whepRetryTimer: ReturnType<typeof setTimeout> | null = null;
    let whepRetryDelay = WHEP_RETRY_BASE_MS;
    let lastFramesDecoded = -1;
    let stalledPolls = 0;
    let freezeActive = false;
    let recoveryAttempts = 0;
    let probeInFlight = false;

    const updateAspect = () => {
      if (!video.videoWidth || !video.videoHeight) return;
      const next = Math.round((video.videoWidth / video.videoHeight) * 1000) / 1000;
      setVideoAspect((prev) => (prev !== null && Math.abs(prev - next) < 0.001 ? prev : next));
    };

    const logPath = (next: PlayerPath) => {
      if (mode === next) return;
      mode = next;
      if (process.env.NODE_ENV !== "production") {
        console.info("[live] player path", next);
      }
      posthogRef.current?.capture("player_path", { path: next, stream_path: path });
    };

    const logFreeze = (state: "start" | "recovered") => {
      posthogRef.current?.capture(state === "start" ? "player_freeze" : "player_recovered", {
        stream_path: path,
        player_path: mode,
      });
    };

    const logFallback = (reason: string) => {
      posthogRef.current?.capture("player_fallback", { stream_path: path, reason });
    };

    const tryAutoplay = () => {
      const v = getVideo();
      if (!v) return;
      v.muted = false;
      v.play()
        .then(() => {
          setIsMutedState(false);
          setNeedsPlayButton(false);
        })
        .catch(() => {
          v.muted = true;
          setIsMutedState(true);
          v.play()
            .then(() => setNeedsPlayButton(false))
            .catch(() => setNeedsPlayButton(true));
        });
    };

    const stopWhepStats = () => {
      if (whepStatsInterval) clearInterval(whepStatsInterval);
      whepStatsInterval = null;
      lastFramesDecoded = -1;
      stalledPolls = 0;
    };

    const stopHlsHealth = () => {
      if (hlsHealthInterval) clearInterval(hlsHealthInterval);
      hlsHealthInterval = null;
      if (hlsHealthVideo && hlsHealthTimeUpdate) {
        hlsHealthVideo.removeEventListener("timeupdate", hlsHealthTimeUpdate);
      }
      hlsHealthTimeUpdate = null;
      hlsHealthVideo = null;
    };

    const stopBackgroundRetry = () => {
      if (backgroundRetryInterval) clearInterval(backgroundRetryInterval);
      backgroundRetryInterval = null;
    };

    const stopWhepRetry = () => {
      if (whepRetryTimer) clearTimeout(whepRetryTimer);
      whepRetryTimer = null;
    };

    const teardownWhep = () => {
      stopWhepStats();
      session?.close();
      session = null;
    };

    const teardownHls = () => {
      stopBackgroundRetry();
      stopHlsHealth();
      hls?.destroy();
      hls = null;
      hlsInstanceRef.current = null;
    };

    const startHlsHealthMonitor = (v: HTMLVideoElement) => {
      stopHlsHealth();
      hlsHealthVideo = v;
      let lastAdvanceAt = Date.now();
      let lastCurrentTime = v.currentTime;
      let recoveryAttempted = false;
      hlsHealthTimeUpdate = () => {
        if (v.currentTime !== lastCurrentTime) {
          lastCurrentTime = v.currentTime;
          lastAdvanceAt = Date.now();
          recoveryAttempted = false;
        }
      };
      v.addEventListener("timeupdate", hlsHealthTimeUpdate);
      hlsHealthInterval = setInterval(() => {
        if (disposed || v.paused || v.seeking) return;
        if (Date.now() - lastAdvanceAt < HLS_STALL_MS) return;
        if (recoveryAttempted) return;
        recoveryAttempted = true;
        logFreeze("start");
        if (hls) {
          hls.recoverMediaError();
        } else if (v.duration && Number.isFinite(v.duration)) {
          v.currentTime = v.duration;
        }
      }, STATS_POLL_MS);
    };

    const startWhepStats = () => {
      stopWhepStats();
      whepStatsInterval = setInterval(async () => {
        if (disposed || !session) return;
        const stats = await session.pc.getStats().catch(() => null);
        if (!stats || disposed || !session) return;
        let framesDecoded: number | null = null;
        let bytesReceived: number | null = null;
        stats.forEach((report) => {
          if (report.type === "inbound-rtp" && report.kind === "video") {
            framesDecoded = typeof report.framesDecoded === "number" ? report.framesDecoded : null;
            bytesReceived = typeof report.bytesReceived === "number" ? report.bytesReceived : null;
          }
        });
        if (framesDecoded === null || bytesReceived === null) return;
        if (lastFramesDecoded === -1) {
          lastFramesDecoded = framesDecoded;
          return;
        }
        const stalled = framesDecoded === lastFramesDecoded && bytesReceived > 0;
        lastFramesDecoded = framesDecoded;
        if (!stalled) {
          stalledPolls = 0;
          if (freezeActive) {
            freezeActive = false;
            recoveryAttempts = 0;
            logFreeze("recovered");
          }
          return;
        }
        stalledPolls += 1;
        if (stalledPolls < FREEZE_STALL_POLLS) return;
        stalledPolls = 0;
        if (!freezeActive) {
          freezeActive = true;
          logFreeze("start");
        }
        recoveryAttempts += 1;
        if (recoveryAttempts > FREEZE_RECOVERY_CAP) {
          teardownWhep();
          startHls("freeze");
          return;
        }
        session?.restartIce();
      }, STATS_POLL_MS);
    };

    const handleWhepConnectionChange = () => {
      if (disposed || !session) return;
      const state = session.pc.connectionState;
      if (state !== "failed") return;
      session
        .restartIce()
        .then((restarted) => {
          if (disposed || !session) return;
          if (!restarted || session.pc.connectionState === "failed") {
            teardownWhep();
            startHls("ice-failed");
          }
        })
        .catch(() => {
          if (!disposed) {
            teardownWhep();
            startHls("ice-failed");
          }
        });
    };

    const startBackgroundWhepRetry = () => {
      stopBackgroundRetry();
      backgroundRetryInterval = setInterval(() => {
        if (disposed || probeInFlight || mode !== "hls") return;
        const probe = createHiddenVideo();
        if (!probe) return;
        probeInFlight = true;
        connectWhep(whepUrl, probe, 4000)
          .then((probeSession) => {
            probeInFlight = false;
            if (disposed || mode !== "hls") {
              probeSession.close();
              return;
            }
            const v = getVideo();
            const stream = probe.srcObject;
            if (!v || !stream) {
              probeSession.close();
              return;
            }
            teardownHls();
            v.srcObject = stream;
            session = probeSession;
            probeSession.pc.onconnectionstatechange = handleWhepConnectionChange;
            logPath("whep");
            logFreeze("recovered");
            startWhepStats();
          })
          .catch(() => {
            probeInFlight = false;
          });
      }, WHEP_BACKGROUND_RETRY_MS);
    };

    const startHls = (reason: string) => {
      teardownWhep();
      logFallback(reason);
      const v = getVideo();
      if (!v) return;
      if (Hls.isSupported()) {
        const h = new Hls({
          lowLatencyMode: true,
          enableWorker: true,
          liveSyncDuration: HLS_LIVE_SYNC_DURATION_S,
          liveSyncDurationCount: HLS_LIVE_SYNC_DURATION_COUNT,
        });
        h.loadSource(hlsUrl);
        h.attachMedia(v);
        h.on(Hls.Events.MANIFEST_PARSED, () => tryAutoplay());
        h.on(Hls.Events.ERROR, (_evt, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            h.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            h.recoverMediaError();
          } else {
            teardownHls();
            setNeedsPlayButton(true);
          }
        });
        hls = h;
        hlsInstanceRef.current = h;
        logPath("hls");
        startHlsHealthMonitor(v);
      } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = hlsUrl;
        v.addEventListener("loadedmetadata", () => tryAutoplay(), { once: true });
        logPath("native");
        startHlsHealthMonitor(v);
      } else {
        logPath("none");
        setNeedsPlayButton(true);
      }
      startBackgroundWhepRetry();
    };

    const scheduleWhepRetry = () => {
      if (disposed) return;
      stopWhepRetry();
      whepRetryTimer = setTimeout(() => {
        whepRetryDelay = Math.min(whepRetryDelay * 2, WHEP_RETRY_MAX_MS);
        connectWhepFlow();
      }, whepRetryDelay);
    };

    const connectWhepFlow = () => {
      if (disposed) return;
      connectWhep(whepUrl, getVideo, 4000)
        .then((s) => {
          if (disposed) {
            s.close();
            return;
          }
          whepRetryDelay = WHEP_RETRY_BASE_MS;
          session = s;
          logPath("whep");
          tryAutoplay();
          startWhepStats();
          s.pc.onconnectionstatechange = handleWhepConnectionChange;
        })
        .catch((err) => {
          if (disposed) return;
          if (err instanceof WhepNotLiveError) {
            scheduleWhepRetry();
            return;
          }
          startHls("whep-error");
        });
    };

    connectWhepFlow();

    const handlePause = () => {
      if (disposed || mode === "none" || needsPlayButtonRef.current) return;
      setNeedsResume(true);
    };
    const handlePlay = () => {
      setNeedsResume(false);
    };
    video.addEventListener("pause", handlePause);
    video.addEventListener("play", handlePlay);
    updateAspect();
    video.addEventListener("loadedmetadata", updateAspect);
    video.addEventListener("resize", updateAspect);

    const handlePageHide = () => {
      stopWhepRetry();
      teardownWhep();
      teardownHls();
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted || disposed) return;
      if (session || hls) return;
      connectWhepFlow();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible" || !session) return;
      session.pc.getStats().catch(() => {});
    };
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("loadedmetadata", updateAspect);
      video.removeEventListener("resize", updateAspect);
      setVideoAspect(null);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopWhepRetry();
      teardownWhep();
      teardownHls();
      video.srcObject = null;
      video.removeAttribute("src");
      video.load();
    };
    }
  }, [isLive, isDemo, path, whepUrl, hlsUrl]);

  const handleManualPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setIsMutedState(false);
    video
      .play()
      .then(() => {
        setNeedsPlayButton(false);
        const hls = hlsInstanceRef.current;
        if (hls?.liveSyncPosition) {
          video.currentTime = hls.liveSyncPosition;
        } else if (video.duration && Number.isFinite(video.duration)) {
          video.currentTime = video.duration;
        }
      })
      .catch(() => {});
  };

  const handleUnmute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setIsMutedState(false);
  };

  const handleResume = () => {
    const video = videoRef.current;
    if (!video) return;
    video
      .play()
      .then(() => setNeedsResume(false))
      .catch(() => {});
  };

  return {
    videoRef,
    needsPlayButton,
    isMuted,
    needsResume,
    videoAspect,
    handleManualPlay,
    handleUnmute,
    handleResume,
    setMuted,
  };
}

"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  FC,
  ReactNode,
} from "react";
import { getDevToolsState } from "./DevToolsContext";

export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  thumbnail?: string;
  duration?: number;
}

interface AudioState {
  currentTrack: Track | null;
  loadingTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  buffered: number;
  playlist: Track[];
  analyser: AnalyserNode | null;
}

interface AudioContextType extends AudioState {
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  toggle: () => void;
  seekTo: (time: number) => void;
  loadTrack: (track: Track, autoPlay?: boolean) => Promise<void>;
  loadPlaylist: (tracks: Track[], startIndex?: number) => void;
  formatTime: (seconds: number) => string;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error("useAudio must be used within an AudioProvider");
  return context;
};

let globalAudio: HTMLAudioElement | null = null;

const getGlobalAudio = () => {
  if (!globalAudio && typeof window !== "undefined") {
    globalAudio = new Audio();
    globalAudio.preload = "metadata";
    globalAudio.crossOrigin = "anonymous";
  }
  return globalAudio;
};

const buildAudioUrl = (trackId: string): string => {
  if (typeof window === "undefined") return `/api/audio/${trackId}`;
  const devSettings = getDevToolsState();
  const url = new URL(`/api/audio/${trackId}`, window.location.origin);
  if (devSettings.isDevMode && devSettings.useLocalAudio) {
    url.searchParams.set("local", "1");
  }
  if (devSettings.isDevMode && devSettings.simulateSlowNetwork) {
    url.searchParams.set("delay", String(devSettings.slowNetworkDelay));
  }
  return url.toString();
};

export const AudioProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const audio = getGlobalAudio();
  const [state, setState] = useState<AudioState>({
    currentTrack: null,
    loadingTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
    isLoading: false,
    buffered: 0,
    playlist: [],
    analyser: null,
  });

  const isAudioSourceConnected = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pendingReload = useRef(false);

  useEffect(() => {
    if (!audio || isAudioSourceConnected.current) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 64;

      const source = audioCtx.createMediaElementSource(audio);
      source.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);

      isAudioSourceConnected.current = true;
      setState((prev) => ({ ...prev, analyser: analyserNode }));

      const resumeOnce = () => {
        audioCtx.resume().catch(() => {});
      };
      const events: (keyof DocumentEventMap)[] = ["pointerdown", "touchend", "keydown"];
      events.forEach((e) =>
        document.addEventListener(e, resumeOnce, { once: true, capture: true, passive: true }),
      );
    } catch (e) {
      console.error("Web Audio API setup failed", e);
    }
  }, [audio]);

  useEffect(() => {
    if (!audio) return;
    let animationId: number;

    const tick = () => {
      if (!audio.paused) {
        setState((prev) => ({
          ...prev,
          currentTime: audio.currentTime,
        }));
        animationId = requestAnimationFrame(tick);
      }
    };

    const handlePlaying = () => {
      setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
      cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(tick);
    };

    const handleWaiting = () => {
      setState((prev) => ({ ...prev, isLoading: true }));
    };

    const handlePause = () => {
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        currentTime: audio.currentTime,
      }));
      cancelAnimationFrame(animationId);
    };

    const handleEnded = () => {
      setState((prev) => ({ ...prev, isPlaying: false, isLoading: false }));
      cancelAnimationFrame(animationId);
    };

    const handleLoadedMetadata = () => {
      setState((prev) => ({
        ...prev,
        duration: audio.duration || prev.duration,
        currentTime: audio.currentTime,
      }));
    };

    const handleCanPlay = () => {
      setState((prev) => ({ ...prev, loadingTrack: null }));
    };

    const handleProgress = () => {
      if (audio.buffered.length === 0 || !audio.duration || !isFinite(audio.duration)) return;
      const end = audio.buffered.end(audio.buffered.length - 1);
      setState((prev) => ({ ...prev, buffered: Math.min(1, end / audio.duration) }));
    };

    const handleError = () => {
      setState((prev) => ({ ...prev, isPlaying: false, isLoading: false, buffered: 0 }));
    };

    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("progress", handleProgress);
    audio.addEventListener("error", handleError);

    if (!audio.paused) {
      animationId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(animationId);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("progress", handleProgress);
      audio.removeEventListener("error", handleError);
    };
  }, [audio]);

  const play = useCallback(async () => {
    if (!audio || !audio.src) return;
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
    if (pendingReload.current) {
      pendingReload.current = false;
      audio.load();
    }
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await audio.play();
    } catch (err) {
      console.warn("Playback prevented:", err);
      setState((prev) => ({ ...prev, isPlaying: false, isLoading: false }));
    }
  }, [audio]);

  const pause = useCallback(() => {
    if (!audio) return;
    if (audio.readyState < 3) {
      pendingReload.current = true;
    }
    audio.pause();
  }, [audio]);

  const stop = useCallback(() => {
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setState((prev) => ({
      ...prev,
      currentTrack: null,
      loadingTrack: null,
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
      buffered: 0,
    }));
  }, [audio]);

  const toggle = useCallback(() => {
    if (!audio) return;
    if (audio.paused) play();
    else pause();
  }, [audio, play, pause]);

  const seekTo = useCallback(
    (time: number) => {
      if (!audio) return;
      audio.currentTime = time;
      setState((prev) => ({ ...prev, currentTime: time }));
    },
    [audio]
  );

  const loadTrack = useCallback(
    async (track: Track, autoPlay = false) => {
      if (!audio) return;

      if (state.currentTrack?.id === track.id) {
        if (autoPlay && audio.paused) {
          await play();
        }
        return;
      }

      audio.src = buildAudioUrl(track.id);
      audio.currentTime = 0;

      setState((prev) => ({
        ...prev,
        currentTrack: track,
        loadingTrack: autoPlay ? track : null,
        isLoading: autoPlay,
        isPlaying: false,
        currentTime: 0,
        duration: track.duration || 0,
        buffered: 0,
      }));

      if (autoPlay) {
        await play();
      }
    },
    [audio, state.currentTrack?.id, play]
  );

  const loadPlaylist = useCallback(
    (tracks: Track[], startIndex = 0) => {
      setState((prev) => ({ ...prev, playlist: tracks }));
      if (tracks[startIndex]) {
        loadTrack(tracks[startIndex], false);
      }
    },
    [loadTrack]
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <AudioContext.Provider
      value={{
        ...state,
        play,
        pause,
        stop,
        toggle,
        seekTo,
        loadTrack,
        loadPlaylist,
        formatTime,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

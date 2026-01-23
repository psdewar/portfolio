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
  playlist: Track[];
  currentIndex: number;
  isShuffled: boolean;
  repeatMode: "none" | "track" | "playlist";
  analyser: AnalyserNode | null; // Added Analyser
}

interface AudioContextType extends AudioState {
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => void;
  seekTo: (time: number) => void;
  loadTrack: (track: Track, autoPlay?: boolean) => Promise<void>;
  loadPlaylist: (tracks: Track[], startIndex?: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  formatTime: (seconds: number) => string;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error("useAudio must be used within an AudioProvider");
  return context;
};

// Singleton audio instance
let globalAudio: HTMLAudioElement | null = null;
const blobUrlCache = new Map<string, string>();

const getGlobalAudio = () => {
  if (!globalAudio && typeof window !== "undefined") {
    globalAudio = new Audio();
    globalAudio.preload = "auto";
    // Important for Web Audio API to work with fetched blobs/external sources
    globalAudio.crossOrigin = "anonymous";
  }
  return globalAudio;
};

const fetchAudioBlob = async (trackId: string): Promise<string> => {
  if (blobUrlCache.has(trackId)) return blobUrlCache.get(trackId)!;

  const devSettings = getDevToolsState();

  // Build URL with dev flags
  const url = new URL(`/api/audio/${trackId}`, window.location.origin);
  if (devSettings.isDevMode && devSettings.useLocalAudio) {
    url.searchParams.set("local", "1");
  }
  if (devSettings.isDevMode && devSettings.simulateSlowNetwork) {
    url.searchParams.set("delay", String(devSettings.slowNetworkDelay));
  }

  const response = await fetch(url.toString(), {
    headers: { "Cache-Control": "private, max-age=86400" },
  });

  if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  blobUrlCache.set(trackId, blobUrl);

  setTimeout(() => {
    if (blobUrlCache.has(trackId)) {
      URL.revokeObjectURL(blobUrl);
      blobUrlCache.delete(trackId);
    }
  }, 86400000);

  return blobUrl;
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
    playlist: [],
    currentIndex: -1,
    isShuffled: false,
    repeatMode: "none",
    analyser: null,
  });

  const loadingTrackId = useRef<string | null>(null);
  // Ref to track if we've already connected the Web Audio API to this element
  const isAudioSourceConnected = useRef(false);

  // Initialize Web Audio API
  useEffect(() => {
    if (!audio || isAudioSourceConnected.current) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 64; // Low resolution for "blocky" look

      // Create source and connect
      const source = audioCtx.createMediaElementSource(audio);
      source.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);

      isAudioSourceConnected.current = true;
      setState((prev) => ({ ...prev, analyser: analyserNode }));

      // Resume context on user interaction (browsers block auto-audio-context)
      const resumeAudio = () => {
        if (audioCtx.state === "suspended") audioCtx.resume();
      };
      document.addEventListener("click", resumeAudio, { once: true });
      document.addEventListener("touchstart", resumeAudio, { once: true });
      document.addEventListener("keydown", resumeAudio, { once: true });
    } catch (e) {
      console.error("Web Audio API setup failed", e);
    }
  }, [audio]);

  // High-frequency time updates for precise lyrics sync
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

    const handlePlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true }));
      animationId = requestAnimationFrame(tick);
    };

    const handlePause = () => {
      setState((prev) => ({ ...prev, isPlaying: false, currentTime: audio.currentTime }));
      cancelAnimationFrame(animationId);
    };

    const handleEnded = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
      cancelAnimationFrame(animationId);
    };

    const handleLoadedMetadata = () => {
      setState((prev) => ({
        ...prev,
        duration: audio.duration || prev.duration,
        currentTime: audio.currentTime,
      }));
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    // Start tick loop if already playing
    if (!audio.paused) {
      animationId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(animationId);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [audio]);

  const play = useCallback(async () => {
    if (!audio || !audio.src) return;
    try {
      await audio.play();
    } catch (err) {
      console.warn("Playback prevented:", err);
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, [audio]);

  const pause = useCallback(() => {
    if (!audio) return;
    audio.pause();
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
      // Update state immediately for visual feedback (especially when paused)
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

      loadingTrackId.current = track.id;
      setState((prev) => ({ ...prev, isLoading: true, isPlaying: false, loadingTrack: track }));

      try {
        const blobUrl = await fetchAudioBlob(track.id);

        if (loadingTrackId.current === track.id) {
          audio.src = blobUrl;
          audio.currentTime = 0;

          setState((prev) => ({
            ...prev,
            currentTrack: track,
            loadingTrack: null,
            duration: track.duration || 0,
            isLoading: false,
          }));

          if (autoPlay) {
            await play();
          }
        }
      } catch (error) {
        console.error("Load track failed:", error);
        setState((prev) => ({ ...prev, isLoading: false, loadingTrack: null }));
      } finally {
        if (loadingTrackId.current === track.id) {
          loadingTrackId.current = null;
        }
      }
    },
    [audio, state.currentTrack?.id, play]
  );

  const loadPlaylist = useCallback(
    (tracks: Track[], startIndex = 0) => {
      setState((prev) => ({ ...prev, playlist: tracks, currentIndex: startIndex }));
      if (tracks[startIndex]) {
        loadTrack(tracks[startIndex], false);
      }
    },
    [loadTrack]
  );

  const nextTrack = useCallback(() => {
    if (state.playlist.length === 0) return;
    const nextIndex = (state.currentIndex + 1) % state.playlist.length;
    setState((prev) => ({ ...prev, currentIndex: nextIndex }));
    loadTrack(state.playlist[nextIndex], true);
  }, [state.playlist, state.currentIndex, loadTrack]);

  const previousTrack = useCallback(() => {
    if (state.playlist.length === 0) return;
    const prevIndex = state.currentIndex === 0 ? state.playlist.length - 1 : state.currentIndex - 1;
    setState((prev) => ({ ...prev, currentIndex: prevIndex }));
    loadTrack(state.playlist[prevIndex], true);
  }, [state.playlist, state.currentIndex, loadTrack]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const toggleShuffle = () => setState((prev) => ({ ...prev, isShuffled: !prev.isShuffled }));
  const toggleRepeat = () =>
    setState((prev) => ({
      ...prev,
      repeatMode:
        prev.repeatMode === "none" ? "track" : prev.repeatMode === "track" ? "playlist" : "none",
    }));

  return (
    <AudioContext.Provider
      value={{
        ...state,
        play,
        pause,
        toggle,
        seekTo,
        loadTrack,
        loadPlaylist,
        nextTrack,
        previousTrack,
        toggleShuffle,
        toggleRepeat,
        formatTime,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

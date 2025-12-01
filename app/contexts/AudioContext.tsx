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
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  playlist: Track[];
  currentIndex: number;
  isShuffled: boolean;
  repeatMode: "none" | "track" | "playlist";
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
  }
  return globalAudio;
};

const fetchAudioBlob = async (trackId: string): Promise<string> => {
  if (blobUrlCache.has(trackId)) return blobUrlCache.get(trackId)!;

  const response = await fetch(`/api/audio/${trackId}`, {
    headers: { "Cache-Control": "private, max-age=86400" },
  });

  if (!response.ok) throw new Error("Failed to fetch audio");

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  blobUrlCache.set(trackId, blobUrl);

  // Cleanup after 24h
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
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
    isLoading: false,
    playlist: [],
    currentIndex: -1,
    isShuffled: false,
    repeatMode: "none",
  });

  // Prevent race conditions in React Strict Mode
  const loadingTrackId = useRef<string | null>(null);

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
    },
    [audio]
  );

  const loadTrack = useCallback(
    async (track: Track, autoPlay = false) => {
      if (!audio) return;

      // Case 1: Track is already active.
      if (state.currentTrack?.id === track.id) {
        if (autoPlay && audio.paused) {
          await play();
        }
        return;
      }

      // Case 2: New track
      loadingTrackId.current = track.id;
      setState((prev) => ({ ...prev, isLoading: true, isPlaying: false }));

      try {
        const blobUrl = await fetchAudioBlob(track.id);

        // Ensure we are still trying to load the same track (race condition check)
        if (loadingTrackId.current === track.id) {
          audio.src = blobUrl;
          audio.currentTime = 0;

          setState((prev) => ({
            ...prev,
            currentTrack: track,
            duration: track.duration || 0,
            isLoading: false,
          }));

          if (autoPlay) {
            await play();
          }
        }
      } catch (error) {
        console.error("Load track failed", error);
        setState((prev) => ({ ...prev, isLoading: false }));
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

  // UI Helpers
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

  useEffect(() => {
    if (!audio) return;

    const updateState = () => {
      setState((prev) => ({
        ...prev,
        currentTime: audio.currentTime,
        duration: audio.duration || prev.duration,
        isPlaying: !audio.paused,
      }));
    };

    const handleEnded = () => setState((prev) => ({ ...prev, isPlaying: false }));

    // We only listen to crucial events to minimize re-renders
    audio.addEventListener("timeupdate", updateState);
    audio.addEventListener("play", updateState);
    audio.addEventListener("pause", updateState);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadedmetadata", updateState);

    return () => {
      audio.removeEventListener("timeupdate", updateState);
      audio.removeEventListener("play", updateState);
      audio.removeEventListener("pause", updateState);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadedmetadata", updateState);
    };
  }, [audio]);

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

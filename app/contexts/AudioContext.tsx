"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

// Types for our audio system
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
  // Playback controls
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seekTo: (time: number) => void;

  // Track management
  loadTrack: (track: Track) => void;
  loadPlaylist: (tracks: Track[], startIndex?: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;

  // Playlist controls
  toggleShuffle: () => void;
  toggleRepeat: () => void;

  // Utility
  formatTime: (seconds: number) => string;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
};

// Global audio element and blob URL cache
let globalAudio: HTMLAudioElement | null = null;
const blobUrlCache = new Map<string, string>();

const getGlobalAudio = () => {
  if (!globalAudio && typeof window !== "undefined") {
    globalAudio = new Audio();
    globalAudio.preload = "metadata"; // Only preload metadata, not the full file
  }
  return globalAudio;
};

const fetchAudioBlob = async (trackId: string): Promise<string> => {
  if (blobUrlCache.has(trackId)) {
    return blobUrlCache.get(trackId)!;
  }

  try {
    const response = await fetch(`/api/audio/${trackId}`, {
      headers: {
        "Cache-Control": "private, max-age=86400",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    blobUrlCache.set(trackId, blobUrl);

    setTimeout(() => {
      if (blobUrlCache.has(trackId)) {
        URL.revokeObjectURL(blobUrl);
        blobUrlCache.delete(trackId);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    return blobUrl;
  } catch (error) {
    console.error("Failed to fetch audio blob:", error);
    throw error;
  }
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  // Track loading state to prevent double-fetch in React Strict Mode
  const loadingTrackRef = useRef<string | null>(null);

  // Initialize volume from audio element on mount
  useEffect(() => {
    if (audio) {
      setState((prev) => ({ ...prev, volume: audio.volume }));
    }
  }, [audio]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!audio) return;

    const handleLoadStart = () => setState((prev) => ({ ...prev, isLoading: true }));
    const handleCanPlay = () => setState((prev) => ({ ...prev, isLoading: false }));
    const handleLoadedMetadata = () => {
      setState((prev) => ({ ...prev, duration: audio.duration || 0 }));
    };

    const handleTimeUpdate = () => {
      setState((prev) => ({ ...prev, currentTime: audio.currentTime || 0 }));
    };

    const handleEnded = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    };

    const handleError = () => {
      setState((prev) => ({ ...prev, isLoading: false, isPlaying: false }));
      if (process.env.NODE_ENV === "development") {
        console.error("Audio playback error");
      }
    };

    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [audio]);

  // Playback controls
  const play = useCallback(() => {
    if (!audio || !state.currentTrack) return;

    if (process.env.NODE_ENV === "development") {
      console.log("Attempting to play:", state.currentTrack.title);
    }

    audio
      .play()
      .then(() => {
        if (process.env.NODE_ENV === "development") {
          console.log("Playback started successfully");
        }
        setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
      })
      .catch((error) => {
        console.error("Playback failed:", error);
        setState((prev) => ({ ...prev, isLoading: false }));
      });
  }, [audio, state.currentTrack]);

  const pause = useCallback(() => {
    if (!audio) return;
    audio.pause();
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, [audio]);

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seekTo = useCallback(
    (time: number) => {
      if (!audio) return;
      audio.currentTime = time;
      setState((prev) => ({ ...prev, currentTime: time }));
    },
    [audio]
  );

  // Track management with blob URL caching
  const loadTrack = useCallback(
    async (track: Track) => {
      if (!audio) return;

      // Prevent double-loading in React Strict Mode
      if (loadingTrackRef.current === track.id) {
        return;
      }
      loadingTrackRef.current = track.id;

      audio.pause();

      setState((prev) => ({
        ...prev,
        currentTrack: track,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        isLoading: true,
      }));

      try {
        const blobUrl = await fetchAudioBlob(track.id);
        // Only set source if this is still the current track
        if (loadingTrackRef.current === track.id) {
          audio.src = blobUrl;
          audio.load();
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to load track:", track.title, error);
        }
        setState((prev) => ({ ...prev, isLoading: false }));
      } finally {
        loadingTrackRef.current = null;
      }
    },
    [audio]
  );

  const loadPlaylist = useCallback(
    (tracks: Track[], startIndex = 0) => {
      setState((prev) => ({
        ...prev,
        playlist: tracks,
        currentIndex: startIndex,
      }));
      if (tracks[startIndex]) {
        loadTrack(tracks[startIndex]);
      }
    },
    [loadTrack]
  );

  const nextTrack = useCallback(() => {
    if (state.playlist.length === 0) return;
    const nextIndex = (state.currentIndex + 1) % state.playlist.length;
    setState((prev) => ({ ...prev, currentIndex: nextIndex }));
    loadTrack(state.playlist[nextIndex]);
  }, [state.playlist, state.currentIndex, loadTrack]);

  const previousTrack = useCallback(() => {
    if (state.playlist.length === 0) return;
    const prevIndex = state.currentIndex === 0 ? state.playlist.length - 1 : state.currentIndex - 1;
    setState((prev) => ({ ...prev, currentIndex: prevIndex }));
    loadTrack(state.playlist[prevIndex]);
  }, [state.playlist, state.currentIndex, loadTrack]);

  const toggleShuffle = useCallback(() => {
    setState((prev) => ({ ...prev, isShuffled: !prev.isShuffled }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState((prev) => ({
      ...prev,
      repeatMode:
        prev.repeatMode === "none" ? "track" : prev.repeatMode === "track" ? "playlist" : "none",
    }));
  }, []);

  const contextValue: AudioContextType = {
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
  };

  return <AudioContext.Provider value={contextValue}>{children}</AudioContext.Provider>;
};

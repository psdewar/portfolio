"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface VideoContextType {
  videoState: {
    isOpen: boolean;
    videoId: string | null;
    startTime: number;
  };
  openVideo: (videoId: string) => void;
  closeVideo: () => void;
}

const VideoContext = createContext<VideoContextType | null>(null);

export const useVideo = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error("useVideo must be used within VideoProvider");
  }
  return context;
};

export function VideoProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [videoState, setVideoState] = useState<{
    isOpen: boolean;
    videoId: string | null;
    startTime: number;
  }>({ isOpen: false, videoId: null, startTime: 0 });

  useEffect(() => {
    const videoParam = searchParams.get("video");
    const timeParam = searchParams.get("t");
    if (videoParam) {
      setVideoState({
        isOpen: true,
        videoId: videoParam,
        startTime: timeParam ? parseInt(timeParam, 10) : 0,
      });
    }
  }, [searchParams]);

  const openVideo = (videoId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("video", videoId);
    router.replace(url.pathname + url.search);
    setVideoState({ isOpen: true, videoId, startTime: 0 });
  };

  const closeVideo = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("video");
    url.searchParams.delete("t");
    router.replace(url.pathname + url.search);
    setVideoState({ isOpen: false, videoId: null, startTime: 0 });
  };

  return (
    <VideoContext.Provider value={{ videoState, openVideo, closeVideo }}>
      {children}
    </VideoContext.Provider>
  );
}

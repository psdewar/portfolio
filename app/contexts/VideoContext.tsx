"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getVideoMetadata } from "app/lib/videos.config";

interface VideoContextType {
  videoState: {
    isOpen: boolean;
    videoId: string | null;
    startTime: number;
  };
  openVideo: (videoId: string, videoSrc: string, instagramUrl?: string) => void;
  closeVideo: () => void;
  registerVideo: (videoId: string, videoSrc: string, instagramUrl?: string) => void;
}

const VideoContext = createContext<VideoContextType | null>(null);

export const useVideo = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error("useVideo must be used within VideoProvider");
  }
  return context;
};

function VideoParamsHandler({
  onVideoFromUrl,
}: {
  onVideoFromUrl: (videoId: string, startTime: number) => void;
}) {
  const searchParams = useSearchParams();
  const handledVideoFromUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const videoParam = searchParams.get("video");
    const timeParam = searchParams.get("t");
    const lastHandled = handledVideoFromUrlRef.current;

    if (videoParam && videoParam !== lastHandled) {
      handledVideoFromUrlRef.current = videoParam;
      onVideoFromUrl(videoParam, timeParam ? parseInt(timeParam, 10) : 0);
    } else if (!videoParam && lastHandled) {
      handledVideoFromUrlRef.current = null;
    }
  }, [searchParams, onVideoFromUrl]);

  return null;
}

export function VideoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [videoState, setVideoState] = useState<{
    isOpen: boolean;
    videoId: string | null;
    startTime: number;
  }>({ isOpen: false, videoId: null, startTime: 0 });
  const [modalData, setModalData] = useState<{
    videoSrc: string;
    instagramUrl?: string;
    fromUrl?: boolean; // Track if video was opened via URL parameter
  } | null>(null);

  const videoRegistryRef = useRef<Map<string, { videoSrc: string; instagramUrl?: string }>>(
    new Map()
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const handledVideoFromUrlRef = useRef<string | null>(null);

  const registerVideo = useCallback((videoId: string, videoSrc: string, instagramUrl?: string) => {
    videoRegistryRef.current.set(videoId, { videoSrc, instagramUrl });
  }, []);

  const handleVideoFromUrl = useCallback((videoId: string, startTime: number) => {
    setVideoState({
      isOpen: true,
      videoId,
      startTime,
    });

    // Try registry first, then fall back to manual registration
    const registryData = getVideoMetadata(videoId);
    const manualData = videoRegistryRef.current.get(videoId);

    if (registryData) {
      setModalData({
        videoSrc: registryData.src,
        instagramUrl: registryData.instagramUrl,
        fromUrl: true,
      });
    } else if (manualData) {
      setModalData({ ...manualData, fromUrl: true });
    } else {
      console.warn(`Video "${videoId}" not found in registry or manual registrations`);
    }
  }, []);

  useEffect(() => {
    if (videoState.isOpen && videoRef.current && videoState.startTime > 0) {
      if (Math.abs(videoRef.current.currentTime - videoState.startTime) > 0.5) {
        videoRef.current.currentTime = videoState.startTime;
      }
    }
  }, [videoState.isOpen, videoState.startTime]);

  const openVideo = (videoId: string, videoSrc: string, instagramUrl?: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("video", videoId);
    router.replace(url.pathname + url.search);
    setVideoState({ isOpen: true, videoId, startTime: 0 });
    setModalData({ videoSrc, instagramUrl, fromUrl: false }); // User-initiated, not from URL
  };

  const closeVideo = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("video");
    url.searchParams.delete("t");
    router.replace(url.pathname + url.search);
    setVideoState({ isOpen: false, videoId: null, startTime: 0 });
    setModalData(null);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [router]);

  const handleEnded = useCallback(() => {
    closeVideo();
  }, [closeVideo]);

  return (
    <VideoContext.Provider value={{ videoState, openVideo, closeVideo, registerVideo }}>
      <Suspense fallback={null}>
        <VideoParamsHandler onVideoFromUrl={handleVideoFromUrl} />
      </Suspense>
      {children}

      {videoState.isOpen && modalData && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-8">
          <div className="absolute inset-0" onClick={closeVideo} />
          <video
            ref={videoRef}
            src={modalData.videoSrc}
            controls
            autoPlay
            muted={modalData.fromUrl} // Mute only when loaded from URL parameter
            className="relative h-full max-h-screen w-auto max-w-full object-contain rounded"
            onEnded={handleEnded}
            playsInline
            preload="none"
          />
          <div>
            <button
              aria-label="Close video"
              onClick={closeVideo}
              className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-medium"
            >
              ✕
            </button>
            {modalData.instagramUrl && (
              <a
                aria-label="Open IG reel"
                href={modalData.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-16 right-4 text-white/80 hover:text-white text-2xl font-medium flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}
    </VideoContext.Provider>
  );
}

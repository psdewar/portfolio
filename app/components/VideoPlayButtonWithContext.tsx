"use client";

import { VideoPlayButton } from "./VideoPlayButton";
import { useVideo } from "app/contexts/VideoContext";
import { ReactNode, useEffect } from "react";

interface VideoPlayButtonWithContextProps {
  videoId: string;
  thumbnailSrc?: string;
  videoSrc: string;
  alt?: string;
  className?: string;
  instagramUrl?: string;
  children?: ReactNode;
}

export function VideoPlayButtonWithContext({
  videoId,
  videoSrc,
  instagramUrl,
  children,
  ...props
}: VideoPlayButtonWithContextProps) {
  const { videoState, openVideo, closeVideo, registerVideo } = useVideo();

  useEffect(() => {
    registerVideo(videoId, videoSrc, instagramUrl);
  }, [videoId, videoSrc, instagramUrl, registerVideo]);

  return (
    <VideoPlayButton
      {...props}
      videoSrc={videoSrc}
      instagramUrl={instagramUrl}
      isOpen={videoState.isOpen && videoState.videoId === videoId}
      onOpen={() => openVideo(videoId, videoSrc, instagramUrl)}
      onClose={closeVideo}
      startTime={videoState.videoId === videoId ? videoState.startTime : 0}
    >
      {children}
    </VideoPlayButton>
  );
}

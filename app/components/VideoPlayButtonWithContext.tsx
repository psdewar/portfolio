"use client";

import { VideoPlayButton } from "./VideoPlayButton";
import { useVideo } from "app/contexts/VideoContext";
import { ReactNode } from "react";

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
  children,
  ...props
}: VideoPlayButtonWithContextProps) {
  const { videoState, openVideo, closeVideo } = useVideo();

  return (
    <VideoPlayButton
      {...props}
      isOpen={videoState.isOpen && videoState.videoId === videoId}
      onOpen={() => openVideo(videoId)}
      onClose={closeVideo}
      startTime={videoState.videoId === videoId ? videoState.startTime : 0}
    >
      {children}
    </VideoPlayButton>
  );
}

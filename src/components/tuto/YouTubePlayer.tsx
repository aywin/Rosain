"use client";

import { useEffect, useRef } from "react";

interface YouTubePlayerProps {
  videoId: string;
  isPlaying: boolean;
  onTimeUpdate: (currentTime: number) => void;
  onEnded: () => void;
  onPlayerReady?: (duration: number) => void;
  seekTo?: number;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function YouTubePlayer({
  videoId,
  isPlaying,
  onTimeUpdate,
  onEnded,
  onPlayerReady,
  seekTo,
}: YouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Init YouTube Player
  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    const updateProgress = () => {
      if (playerRef.current?.getCurrentTime && isPlaying) {
        onTimeUpdate(playerRef.current.getCurrentTime());
      }
      rafRef.current = requestAnimationFrame(updateProgress);
    };

    const startProgressUpdate = () => {
      stopProgressUpdate();
      if (playerRef.current?.getPlayerState() === window.YT.PlayerState.PLAYING) {
        rafRef.current = requestAnimationFrame(updateProgress);
      }
    };

    const stopProgressUpdate = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const onReady = (event: any) => {
      playerRef.current = event.target;
      onPlayerReady?.(playerRef.current.getDuration());
    };

    const onStateChange = (event: any) => {
      const state = event.data;
      if (state === window.YT.PlayerState.PLAYING) startProgressUpdate();
      else stopProgressUpdate();
      if (state === window.YT.PlayerState.ENDED) onEnded();
    };

    const initPlayer = () => {
      if (!containerRef.current) return;
      if (!playerRef.current) {
        new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: { modestbranding: 1, rel: 0, controls: 0, disablekb: 1, playsinline: 1, origin: window.location.origin },
          events: { onReady, onStateChange },
        });
      } else {
        playerRef.current.loadVideoById(videoId);
      }
    };

    if (window.YT && window.YT.Player) initPlayer();
    else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.getElementsByTagName("script")[0].parentNode?.insertBefore(tag, document.getElementsByTagName("script")[0]);
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current?.destroy) playerRef.current.destroy();
      playerRef.current = null;
      rafRef.current && cancelAnimationFrame(rafRef.current);
      window.onYouTubeIframeAPIReady = () => {};
    };
  }, [videoId]);

  // Seek depuis le parent
  useEffect(() => {
    if (seekTo != null && playerRef.current?.seekTo) {
      playerRef.current.seekTo(seekTo, true);
    }
  }, [seekTo]);

  const handleClick = () => {
    if (!playerRef.current) return;
    const state = playerRef.current.getPlayerState();
    state === window.YT.PlayerState.PLAYING ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
  };

  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg">
      <div ref={containerRef} className="w-full h-full pointer-events-none" />
      <div className="absolute inset-0 z-10 cursor-pointer" onClick={handleClick} />
    </div>
  );
}

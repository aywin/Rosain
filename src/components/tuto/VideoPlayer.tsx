"use client";

import { useEffect, useRef, useState } from "react";
import VideoControls from "./VideoControls";
import ProgressBar from "./ProgressBar";

interface VideoPlayerProps {
  url: string;
  title: string;
  onAssistantClick: () => void;
  onNext: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function VideoPlayer({
  url,
  title,
  onAssistantClick,
  onNext,
}: VideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const getVideoId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };
  const videoId = getVideoId(url);

  useEffect(() => {
    if (!videoId) return;

    const onPlayerReady = (event: any) => {
      playerRef.current = event.target;
      const dur = playerRef.current?.getDuration?.();
      if (dur) setDuration(dur);
    };

    const onPlayerStateChange = (event: any) => {
      const state = event.data;

      if (state === window.YT.PlayerState.PLAYING) {
        setIsPlaying(true);
        startProgressUpdate();
      } else {
        setIsPlaying(false);
        stopProgressUpdate();
      }

      if (state === window.YT.PlayerState.ENDED) {
        onNext();
      }
    };

    const initPlayer = () => {
      if (!containerRef.current || !videoId) return;
      if (playerRef.current?.destroy) playerRef.current.destroy();

      new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          controls: 0,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    return () => {
      stopProgressUpdate();
      if (playerRef.current?.destroy) playerRef.current.destroy();
    };
  }, [videoId, onNext]);

  const updateProgress = () => {
    if (playerRef.current?.getCurrentTime) {
      setCurrentTime(playerRef.current.getCurrentTime());
    }
    rafRef.current = requestAnimationFrame(updateProgress);
  };

  const startProgressUpdate = () => {
    stopProgressUpdate();
    rafRef.current = requestAnimationFrame(updateProgress);
  };

  const stopProgressUpdate = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    const state = playerRef.current.getPlayerState();
    if (state === window.YT.PlayerState.PLAYING) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  };

  const handleSeekRelative = (seconds: number) => {
    if (!playerRef.current?.seekTo) return;
    let newTime = currentTime + seconds;
    newTime = Math.max(0, Math.min(newTime, duration));
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const handleSeekAbsolute = (time: number) => {
    if (!playerRef.current?.seekTo) return;
    playerRef.current.seekTo(time, true);
    setCurrentTime(time);
  };

  return (
    <div className="flex flex-col items-center relative w-full max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      {/* Player */}
      <div className="relative w-[70%] aspect-video rounded-lg overflow-hidden shadow-lg">
        <div ref={containerRef} className="w-full h-full pointer-events-none" />
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={handlePlayPause}
        />
      </div>

      {/* Barre de progression */}
      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeekAbsolute}
      />

      {/* Contrôles */}
      <VideoControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onPlayPause={handlePlayPause}
        onSeekForward={() => handleSeekRelative(10)}
        onSeekBackward={() => handleSeekRelative(-10)}
        onNext={onNext}
      />

      {/* Bouton assistant */}
      <button
        onClick={onAssistantClick}
        className="mt-4 self-end px-3 py-2 border rounded hover:bg-blue-600 hover:text-white transition"
      >
        Ouvrir Assistant IA →
      </button>
    </div>
  );
}

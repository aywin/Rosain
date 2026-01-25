// front/src/components/tuto/VideoControlPanel.tsx
"use client";

import { FC } from "react";

interface ControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSeekForward: () => void;
  onSeekBackward: () => void;
  onNext: () => void;
}

const Controls: FC<ControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onSeekForward,
  onSeekBackward,
  onNext,
}) => {
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="mt-4 flex flex-col items-center space-y-2">
      {/* Barre de progression */}
      <input
        type="range"
        min={0}
        max={duration}
        value={currentTime}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
      <div className="flex items-center justify-between w-full text-sm text-gray-600">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Boutons de contrôle */}
      <div className="flex space-x-4 mt-2">
        <button onClick={onSeekBackward} className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300">
          -10s
        </button>
        <button
          onClick={onPlayPause}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {isPlaying ? "Pause" : "Lecture"}
        </button>
        <button onClick={onSeekForward} className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300">
          +10s
        </button>
        <button
          onClick={onNext}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Suivant →
        </button>
      </div>
    </div>
  );
};

export default Controls;

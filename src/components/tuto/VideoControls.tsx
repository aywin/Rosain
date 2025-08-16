interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeekForward: () => void;
  onSeekBackward: () => void;
  onNext: () => void;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export default function VideoControls({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeekForward,
  onSeekBackward,
  onNext,
}: VideoControlsProps) {
  return (
    <div className="flex items-center justify-between w-[70%] mt-3 px-4 text-white bg-gray-900 rounded-md py-3">
      <div className="flex gap-3">
        <button
          onClick={onSeekBackward}
          className="px-3 py-1 border rounded hover:bg-gray-700"
        >
          ⏪ -10s
        </button>
        <button
          onClick={onPlayPause}
          className="px-4 py-1 border rounded hover:bg-gray-700"
        >
          {isPlaying ? "⏸ Pause" : "▶ Lecture"}
        </button>
        <button
          onClick={onSeekForward}
          className="px-3 py-1 border rounded hover:bg-gray-700"
        >
          ⏩ +10s
        </button>
      </div>

      <div className="font-mono">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      <button
        onClick={onNext}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition rounded px-4 py-1 font-semibold"
      >
        Suivant <span>➡️</span>
      </button>
    </div>
  );
}

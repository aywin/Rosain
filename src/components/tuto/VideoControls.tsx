// front/src/components/tuto/VideoControls.tsx
import { FaPlay, FaPause, FaBackward, FaForward, FaStepForward } from "react-icons/fa";

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
    <div className="flex items-center justify-between w-[70%] mt-3 px-4 text-white bg-gray-900 rounded-lg py-3 shadow-md">
      <div className="flex gap-3">
        <button
          onClick={onSeekBackward}
          className="flex items-center gap-2 px-3 py-2 border border-gray-700 rounded-lg hover:bg-gray-700 transition"
          title="Reculer de 10 secondes"
        >
          <FaBackward className="text-lg" />
          <span className="text-sm">10s</span>
        </button>

        <button
          onClick={onPlayPause}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition font-semibold"
          title={isPlaying ? "Pause" : "Lecture"}
        >
          {isPlaying ? (
            <>
              <FaPause className="text-lg" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <FaPlay className="text-lg" />
              <span>Lecture</span>
            </>
          )}
        </button>

        <button
          onClick={onSeekForward}
          className="flex items-center gap-2 px-3 py-2 border border-gray-700 rounded-lg hover:bg-gray-700 transition"
          title="Avancer de 10 secondes"
        >
          <span className="text-sm">10s</span>
          <FaForward className="text-lg" />
        </button>
      </div>

      <div className="font-mono text-sm">
        <span className="text-blue-400">{formatTime(currentTime)}</span>
        <span className="text-gray-500 mx-1">/</span>
        <span className="text-gray-400">{formatTime(duration)}</span>
      </div>

      <button
        onClick={onNext}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 transition rounded-lg px-4 py-2 font-semibold shadow-sm"
        title="Chapitre suivant"
      >
        <span>Suivant</span>
        <FaStepForward className="text-lg" />
      </button>
    </div>
  );
}
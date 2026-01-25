// front/src/components/tuto/ProgressBar.tsx
interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export default function ProgressBar({ currentTime, duration, onSeek }: ProgressBarProps) {
  const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-[70%] mt-4">
      <input
        type="range"
        min={0}
        max={duration}
        value={currentTime}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer 
                   [&::-webkit-slider-thumb]:appearance-none 
                   [&::-webkit-slider-thumb]:w-4 
                   [&::-webkit-slider-thumb]:h-4 
                   [&::-webkit-slider-thumb]:rounded-full 
                   [&::-webkit-slider-thumb]:bg-blue-600 
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:shadow-md
                   [&::-webkit-slider-thumb]:hover:bg-blue-700
                   [&::-moz-range-thumb]:w-4 
                   [&::-moz-range-thumb]:h-4 
                   [&::-moz-range-thumb]:rounded-full 
                   [&::-moz-range-thumb]:bg-blue-600 
                   [&::-moz-range-thumb]:border-0
                   [&::-moz-range-thumb]:cursor-pointer
                   hover:bg-gray-400 transition"
        style={{
          background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${percentage}%, #D1D5DB ${percentage}%, #D1D5DB 100%)`,
        }}
      />
    </div>
  );
}
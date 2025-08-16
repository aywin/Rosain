interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export default function ProgressBar({
  currentTime,
  duration,
  onSeek,
}: ProgressBarProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(Number(e.target.value));
  };

  return (
    <input
      type="range"
      min={0}
      max={duration || 0}
      value={currentTime}
      step={0.1} // fluide
      onChange={handleChange}
      className="w-[70%] accent-blue-500 cursor-pointer mt-2"
    />
  );
}

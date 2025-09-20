"use client";

import { FC } from "react";

interface CountdownProps {
  countdown: number | null;
  onSkip: () => void;
}

const Countdown: FC<CountdownProps> = ({ countdown, onSkip }) => {
  if (countdown === null) return null;

  return (
    <div className="mt-4 flex items-center justify-between bg-gray-100 p-3 rounded shadow">
      <p className="text-gray-700">
        Prochain chapitre dans <span className="font-bold">{countdown}</span> sec...
      </p>
      <button
        onClick={onSkip}
        className="ml-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Passer maintenant →
      </button>
    </div>
  );
};

export default Countdown;

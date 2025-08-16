"use client";

interface QuizProps {
  question: string;
  options: string[];
  correctIndex: number;
  onAnswer: (isCorrect: boolean) => void;
}

export default function Quiz({ question, options, correctIndex, onAnswer }: QuizProps) {
  return (
    <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h3 className="text-lg font-bold mb-4">{question}</h3>
        <div className="space-y-2">
          {options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => onAnswer(idx === correctIndex)}
              className="block w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

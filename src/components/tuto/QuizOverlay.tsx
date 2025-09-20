"use client";

import { useState } from "react";
import { MathJax } from "better-react-mathjax";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

interface Answer {
  text: string;
  correct: boolean;
}

interface Question {
  text: string;
  answers: Answer[];
}

export interface Quiz {
  id: string;
  videoId: string;
  timestamp: number; // en secondes
  questions: Question[];
}

interface QuizOverlayProps {
  quiz: Quiz;
  selectedAnswers: Record<number, number>;
  onAnswerChange: (qIndex: number, aIndex: number) => void;
  onSubmit: (timestamp: number) => void;
}

export default function QuizOverlay({
  quiz,
  selectedAnswers,
  onAnswerChange,
  onSubmit,
}: QuizOverlayProps) {
  const [quizState, setQuizState] = useState<"answering" | "success" | "failed" | "correction">("answering");

  const allAnswered = quiz.questions.every((_, i) => selectedAnswers[i] !== undefined);

  const allCorrect = quiz.questions.every(
    (q, i) => q.answers[selectedAnswers[i]]?.correct
  );

  const handleValidation = () => {
    if (!allAnswered) return;
    setQuizState(allCorrect ? "success" : "failed");
  };

  const handleRetry = () => {
    setQuizState("answering");
    quiz.questions.forEach((_, i) => onAnswerChange(i, -1));
  };

  const handleShowCorrection = () => setQuizState("correction");
  const handleContinue = () => {
    setQuizState("answering");
    onSubmit(quiz.timestamp + 1);
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-3xl max-h-[80vh] overflow-auto flex flex-col items-center
                      bg-gradient-to-tr from-[#0D1B2A]/80 via-[#1B9AAA]/50 to-[#FF9F43]/30 
                      rounded-3xl shadow-2xl p-6 text-white animate-fade-in">
        
        <h3 className="text-3xl font-bold mb-6 text-center animate-pulse">🎯 Quiz !</h3>

        {quiz.questions.map((q, qIndex) => (
          <div key={qIndex} className="mb-6 w-full">
            <p className="mb-3 font-semibold text-lg">{q.text}</p>
            <div className="flex flex-col gap-3">
              {q.answers.map((a, aIndex) => {
                const isSelected = selectedAnswers[qIndex] === aIndex;
                const isCorrect = a.correct;
                let optionClass = "flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border-2";

                if (quizState === "answering") {
                  optionClass += isSelected ? " bg-blue-600 border-blue-400" : " hover:bg-blue-500 border-gray-300";
                } else if (quizState === "correction") {
                  if (isCorrect) optionClass += " bg-green-700 border-green-400";
                  else if (isSelected && !isCorrect) optionClass += " bg-red-700 border-red-400";
                  else optionClass += " bg-gray-800 border-gray-700";
                }

                return (
                  <label key={aIndex} className={optionClass}>
                    {quizState === "answering" && (
                      <input
                        type="radio"
                        name={`q-${qIndex}`}
                        checked={isSelected}
                        onChange={() => onAnswerChange(qIndex, aIndex)}
                        className="mr-3 w-5 h-5 accent-blue-400"
                        disabled={quizState !== "answering"}
                      />
                    )}
                    {quizState !== "answering" && (
                      <span className="mr-2 text-lg">
                        {isCorrect ? <FaCheckCircle className="text-green-300"/> :
                         isSelected ? <FaTimesCircle className="text-red-300"/> : null}
                      </span>
                    )}
                    <span>{a.text}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {/* Boutons */}
        {quizState === "answering" && (
          <button
            className={`mt-4 px-6 py-3 rounded-xl font-bold text-white transition
                        ${allAnswered ? "bg-gradient-to-r from-[#1B9AAA] to-[#FF9F43] hover:opacity-90" 
                                     : "bg-gray-500 cursor-not-allowed"}`}
            onClick={handleValidation}
            disabled={!allAnswered}
          >
            Valider ✅
          </button>
        )}

        {quizState === "success" && (
          <div className="text-center mt-4">
            <p className="text-green-400 font-bold mb-3 text-xl animate-pulse">🎉 Bravo ! Toutes vos réponses sont correctes !</p>
            <button
              className="bg-gradient-to-r from-[#1B9AAA] to-[#FF9F43] px-6 py-3 rounded-xl font-semibold hover:opacity-90"
              onClick={handleContinue}
            >
              Continuer la vidéo →
            </button>
          </div>
        )}

        {quizState === "failed" && (
          <div className="text-center mt-4 flex flex-col items-center gap-3">
            <p className="text-red-400 font-semibold text-lg">⚠️ Certaines réponses sont incorrectes.</p>
            <div className="flex gap-4 flex-wrap justify-center">
              <button
                className="bg-yellow-500 px-5 py-2 rounded-xl font-semibold hover:bg-yellow-600"
                onClick={handleRetry}
              >
                Recommencer 🔄
              </button>
              <button
                className="bg-gradient-to-r from-[#1B9AAA] to-[#FF9F43] px-5 py-2 rounded-xl font-semibold hover:opacity-90"
                onClick={handleShowCorrection}
              >
                Voir le corrigé 📖
              </button>
            </div>
          </div>
        )}

        {quizState === "correction" && (
          <div className="text-center mt-4">
            <p className="mb-4 font-medium">Voici le corrigé :</p>
            <button
              className="bg-gradient-to-r from-[#1B9AAA] to-[#FF9F43] px-6 py-2 rounded-xl font-semibold hover:opacity-90"
              onClick={handleContinue}
            >
              Continuer la vidéo →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

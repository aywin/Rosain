
"use client";

import { useState } from "react";

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
  onSubmit: (timestamp: number) => void; // Modifier pour passer le timestamp
}

export default function QuizOverlay({
  quiz,
  selectedAnswers,
  onAnswerChange,
  onSubmit,
}: QuizOverlayProps) {
  // État pour gérer les différents modes : answering (réponse), success (tout correct), failed (erreurs), correction (afficher corrigé)
  const [quizState, setQuizState] = useState<"answering" | "success" | "failed" | "correction">("answering");

  // Vérifier si toutes les questions ont une réponse
  const allAnswered =
    quiz.questions.length > 0 &&
    quiz.questions.every((_, i) => selectedAnswers[i] !== undefined);

  // Vérifier si toutes les réponses sélectionnées sont correctes
  const allCorrect = quiz.questions.every(
    (q, i) => q.answers[selectedAnswers[i]]?.correct
  );

  // Gérer la validation des réponses
  const handleValidation = () => {
    if (!allAnswered) return;
    setQuizState(allCorrect ? "success" : "failed");
  };

  // Gérer l'action "Recommencer"
  const handleRetry = () => {
    setQuizState("answering");
    quiz.questions.forEach((_, i) => onAnswerChange(i, -1)); // -1 pour effacer les sélections
  };

  // Gérer l'action "Voir le corrigé"
  const handleShowCorrection = () => {
    setQuizState("correction");
  };

  // Gérer l'action "Continuer la vidéo"
  const handleContinue = () => {
    setQuizState("answering");
    onSubmit(quiz.timestamp + 1); // Reprendre juste après le timestamp du quiz
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center p-4 text-white z-50">
      <h3 className="text-xl font-bold mb-4">Quiz !</h3>

      {/* Afficher les questions */}
      {quiz.questions.map((q, qIndex) => (
        <div key={qIndex} className="mb-4 w-full max-w-lg">
          <p className="mb-2 font-medium">{q.text}</p>

          {q.answers.map((a, aIndex) => {
            const isSelected = selectedAnswers[qIndex] === aIndex;
            const isCorrect = a.correct;

            let optionClass = "block mb-1 p-2 rounded flex items-center";
            let icon = null;

            if (quizState === "correction") {
              if (isCorrect) {
                optionClass += " bg-green-600";
                icon = <span className="mr-2">✔</span>; // Coche pour réponse correcte
              } else if (isSelected && !isCorrect) {
                optionClass += " bg-red-600";
                icon = <span className="mr-2">✘</span>; // Croix pour réponse incorrecte
              } else {
                optionClass += " bg-gray-700";
              }
            } else if (quizState === "answering") {
              optionClass += isSelected ? " bg-gray-700" : " hover:bg-gray-700";
            } else {
              optionClass += " bg-gray-700"; // Non interactif dans success/failed
            }

            return (
              <label key={aIndex} className={optionClass}>
                {quizState === "answering" && (
                  <input
                    type="radio"
                    name={`q-${qIndex}`}
                    checked={isSelected}
                    onChange={() => onAnswerChange(qIndex, aIndex)}
                    className="mr-2"
                    disabled={quizState !== "answering"}
                  />
                )}
                {icon}
                {a.text}
              </label>
            );
          })}
        </div>
      ))}

      {/* Afficher les boutons en fonction de l'état */}
      {quizState === "answering" && (
        <button
          className={`mt-2 px-4 py-2 rounded ${
            allAnswered
              ? "bg-green-500 hover:bg-green-600"
              : "bg-gray-500 cursor-not-allowed"
          }`}
          onClick={handleValidation}
          disabled={!allAnswered}
        >
          Valider
        </button>
      )}

      {quizState === "success" && (
        <div className="text-center">
          <p className="text-green-400 mb-4">Félicitations, toutes vos réponses sont correctes !</p>
          <button
            className="mt-2 bg-blue-500 px-4 py-2 rounded hover:bg-blue-600"
            onClick={handleContinue}
          >
            Continuer la vidéo →
          </button>
        </div>
      )}

      {quizState === "failed" && (
        <div className="text-center">
          <p className="text-red-400 mb-4">Certaines réponses sont incorrectes.</p>
          <div className="flex gap-4">
            <button
              className="mt-2 bg-yellow-500 px-4 py-2 rounded hover:bg-yellow-600"
              onClick={handleRetry}
            >
              Recommencer
            </button>
            <button
              className="mt-2 bg-blue-500 px-4 py-2 rounded hover:bg-blue-600"
              onClick={handleShowCorrection}
            >
              Voir le corrigé
            </button>
          </div>
        </div>
      )}

      {quizState === "correction" && (
        <div className="text-center">
          <p className="mb-4">Voici le corrigé :</p>
          <button
            className="mt-2 bg-blue-500 px-4 py-2 rounded hover:bg-blue-600"
            onClick={handleContinue}
          >
            Continuer la vidéo →
          </button>
        </div>
      )}
    </div>
  );
}

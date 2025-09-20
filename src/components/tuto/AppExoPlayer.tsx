"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { AppExo } from "@/type/appexo";

interface AppExoPlayerProps {
  exo: AppExo;
  courseId: string;
  onClose: () => void;
  onComplete?: (exoId: string) => void;
}

export default function AppExoPlayer({ exo, courseId, onClose, onComplete }: AppExoPlayerProps) {
  const [completed, setCompleted] = useState(false);
  const [answers, setAnswers] = useState<{ [key: number]: number | null }>({}); // qIdx: optionIdx

  const handleAnswer = (qIdx: number, optIdx: number) => {
    if (!completed) {
      setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
    }
  };

  const handleComplete = () => {
    setCompleted(true);

    // Calculer le score si questions disponibles
    if (exo.questions && exo.questions.length > 0) {
      let score = 0;
      exo.questions.forEach((q, idx) => {
        const chosen = answers[idx];
        if (chosen != null && q.options[chosen]?.isCorrect) score++;
      });
      alert(`Score pour "${exo.title}" : ${score}/${exo.questions.length}`);
    }

    if (onComplete) onComplete(exo.id);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b px-4 py-3">
          <h2 className="font-bold text-lg">📝 {exo.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu de l’exo */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {exo.questions && exo.questions.length > 0 ? (
            <div className="prose max-w-none">
              {exo.questions.map((q, idx) => (
                <div key={idx} className="mb-4">
                  <p className="font-semibold">{q.question}</p>
                  <ul>
                    {q.options.map((opt, optIdx) => (
                      <li key={optIdx}>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`q-${idx}`}
                            checked={answers[idx] === optIdx}
                            disabled={completed}
                            onChange={() => handleAnswer(idx, optIdx)}
                          />
                          {opt.text}
                          {completed && opt.isCorrect && <span className="text-green-600 ml-2">(Correct)</span>}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : exo.content ? (
            <div className="prose max-w-none">
              <p>{exo.content}</p>
            </div>
          ) : (
            <p className="text-gray-500">Aucun contenu ou question pour cet exercice.</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 flex justify-end gap-2">
          {!completed ? (
            <button
              onClick={handleComplete}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Terminer l’exercice
            </button>
          ) : (
            <span className="text-green-600 font-semibold">✔ Terminé</span>
          )}
        </div>
      </div>
    </div>
  );
}

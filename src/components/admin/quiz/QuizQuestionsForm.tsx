// QuizQuestionsForm.tsx
"use client";

import { Question } from "./types";
import LatexInput from "@/components/admin/app/LatexInput";

interface QuizQuestionsFormProps {
  questions: Question[];
  updateQuestionText: (qIndex: number, value: string) => void;
  updateAnswer: (
    qIndex: number,
    aIndex: number,
    field: "text" | "correct",
    value: string | boolean
  ) => void;
  addAnswer: (qIndex: number) => void;
  addQuestion: () => void;
  saveQuiz: () => void;
}

export default function QuizQuestionsForm({
  questions,
  updateQuestionText,
  updateAnswer,
  addAnswer,
  addQuestion,
  saveQuiz,
}: QuizQuestionsFormProps) {
  return (
    <>
      <div className="mb-4">
        {questions.map((question, qIndex) => (
          <div
            key={qIndex}
            className="border rounded p-3 mb-4 bg-gray-50 shadow-sm"
          >
            {/* Question en LaTeX */}
            <LatexInput
              value={question.text}
              onChange={(v) => updateQuestionText(qIndex, v)}
              placeholder={`Question ${qIndex + 1}`}
            />

            {/* Réponses */}
            <div className="mt-3 space-y-2">
              {question.answers.map((answer, aIndex) => (
                <div key={aIndex} className="flex items-center gap-2">
                  <div className="flex-1">
                    <LatexInput
                      value={answer.text}
                      onChange={(v) =>
                        updateAnswer(qIndex, aIndex, "text", v)
                      }
                      placeholder={`Réponse ${aIndex + 1}`}
                    />
                  </div>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={answer.correct}
                      onChange={(e) =>
                        updateAnswer(qIndex, aIndex, "correct", e.target.checked)
                      }
                    />
                    <span className="text-sm">Correcte</span>
                  </label>
                </div>
              ))}
            </div>

            {/* Bouton ajouter réponse */}
            <button
              type="button"
              onClick={() => addAnswer(qIndex)}
              className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm"
            >
              + Ajouter une réponse
            </button>
          </div>
        ))}
      </div>

      {/* Actions globales */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addQuestion}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          + Ajouter une question
        </button>
        <button
          type="button"
          onClick={saveQuiz}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          Sauvegarder le Quiz
        </button>
      </div>
    </>
  );
}

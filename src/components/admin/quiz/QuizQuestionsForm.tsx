"use client";

import { Question } from "./types";
import LatexInput from "@/components/admin/app/LatexInput"; // adapte le chemin si nécessaire

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
          <div key={qIndex} className="border rounded p-3 mb-4 bg-gray-50">
            {/* Question en LaTeX */}
            <LatexInput
              value={question.text}
              onChange={(val) => updateQuestionText(qIndex, val)}
              placeholder={`Question ${qIndex + 1}`}
            />

            {/* Réponses */}
            {question.answers.map((answer, aIndex) => (
              <div key={aIndex} className="flex items-center mb-2">
                <div className="flex-1 mr-2">
                  <LatexInput
                    value={answer.text}
                    onChange={(val) =>
                      updateAnswer(qIndex, aIndex, "text", val)
                    }
                    placeholder={`Réponse ${aIndex + 1}`}
                  />
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={answer.correct}
                    onChange={(e) =>
                      updateAnswer(qIndex, aIndex, "correct", e.target.checked)
                    }
                    className="mr-1"
                  />
                  Correcte
                </label>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addAnswer(qIndex)}
              className="bg-blue-500 text-white px-3 py-1 rounded mt-2"
            >
              + Ajouter une réponse
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addQuestion}
        className="bg-green-500 text-white px-4 py-2 rounded mr-2"
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
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

interface Answer {
  text: string;
  correct: boolean;
}

interface Question {
  text: string;
  answers: Answer[];
}

interface Quiz {
  id: string;
  videoId: string;
  timestamp: number;
  questions?: Question[];
}

interface QuizsProps {
  quizId: string; // on reçoit juste l'ID depuis le clic sur la barre
  onClose: () => void;
}

export default function Quizs({ quizId, onClose }: QuizsProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      const docRef = doc(db, "quizzes", quizId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setQuiz({
          id: docSnap.id,
          videoId: docSnap.data().videoId,
          timestamp: docSnap.data().timestamp,
          questions: docSnap.data().questions,
        });
      }
    };
    fetchQuiz();
  }, [quizId]);

  if (!quiz) return null;

  const handleAnswerSelect = (qIndex: number, aIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIndex]: aIndex,
    }));
  };

  const handleSubmit = () => {
    if (!quiz.questions) return;

    let allCorrect = true;
    quiz.questions.forEach((q, qIndex) => {
      const selectedIndex = selectedAnswers[qIndex];
      if (selectedIndex === undefined || !q.answers[selectedIndex]?.correct) {
        allCorrect = false;
      }
    });

    if (allCorrect) {
      alert("✅ Bravo, toutes les réponses sont correctes !");
      onClose();
    } else {
      setShowRetry(true);
    }
  };

  const retryQuiz = () => {
    setSelectedAnswers({});
    setShowRetry(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-xl shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-black"
        >
          ✖
        </button>
        <h2 className="text-lg font-bold mb-4">Quiz</h2>

        {!showRetry ? (
          <>
            {quiz.questions?.map((q, qIndex) => (
              <div key={qIndex} className="mb-4">
                <p className="font-semibold">{q.text}</p>
                {q.answers.map((a, aIndex) => (
                  <label
                    key={aIndex}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={`question-${qIndex}`}
                      checked={selectedAnswers[qIndex] === aIndex}
                      onChange={() => handleAnswerSelect(qIndex, aIndex)}
                    />
                    <span>{a.text}</span>
                  </label>
                ))}
              </div>
            ))}

            <button
              onClick={handleSubmit}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Valider mes réponses
            </button>
          </>
        ) : (
          <div className="text-center">
            <p className="text-red-600 font-semibold mb-4">
              ❌ Certaines réponses sont incorrectes.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={onClose}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Continuer quand même
              </button>
              <button
                onClick={retryQuiz}
                className="bg-orange-500 text-white px-4 py-2 rounded"
              >
                Reprendre le quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

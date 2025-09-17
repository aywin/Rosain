"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { FaSpinner } from "react-icons/fa";

interface Option { text: string; isCorrect: boolean; }
interface Question { question: string; options: Option[]; }

interface Exo {
  id: string;
  title: string;
  questions: Question[];
  courseId: string;
}

interface ExoPlayerProps {
  exoId: string;
}

export default function ExoPlayer({ exoId }: ExoPlayerProps) {
  const [exo, setExo] = useState<Exo | null>(null);
  const [answers, setAnswers] = useState<{ [key: string]: number | null }>({});
  const [results, setResults] = useState<boolean[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  // Charger l'exercice depuis Firestore
  useEffect(() => {
    const fetchExo = async () => {
      if (!exoId) return;
      setIsLoading(true);
      try {
        const exoDoc = await getDoc(doc(db, "app_exercises", exoId));
        if (exoDoc.exists()) {
          setExo({ id: exoDoc.id, ...exoDoc.data() } as Exo);
        } else {
          setExo(null);
        }
      } catch (err) {
        console.error("Erreur ExoPlayer:", err);
        setExo(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExo();
  }, [exoId]);

  // Charger / Sauver les réponses dans localStorage
  useEffect(() => {
    if (!exoId) return;
    const savedAnswers = localStorage.getItem(`exoAnswers-${exoId}`);
    if (savedAnswers) setAnswers(JSON.parse(savedAnswers));

    const savedResults = localStorage.getItem(`exoResults-${exoId}`);
    if (savedResults) setResults(JSON.parse(savedResults));
  }, [exoId]);

  useEffect(() => {
    if (!exoId) return;
    localStorage.setItem(`exoAnswers-${exoId}`, JSON.stringify(answers));
    localStorage.setItem(`exoResults-${exoId}`, JSON.stringify(results));
  }, [answers, results, exoId]);

  const handleAnswer = (qIdx: number, optIdx: number) => {
    setAnswers((prev) => ({ ...prev, [`${exoId}-${qIdx}`]: optIdx }));
  };

  const handleSubmit = () => {
    if (!exo) return;
    let score = 0;
    const total = exo.questions.length;
    const result: boolean[] = [];

    exo.questions.forEach((q, qIdx) => {
      const chosen = answers[`${exoId}-${qIdx}`];
      const isCorrect = chosen != null && q.options[chosen]?.isCorrect;
      if (isCorrect) score++;
      result.push(isCorrect);
    });

    setResults(result);
    setScore(score);
    setTotal(total);
  };

  const handleReset = () => {
    setAnswers({});
    setResults([]);
    setScore(null);
    setTotal(null);
    localStorage.removeItem(`exoAnswers-${exoId}`);
    localStorage.removeItem(`exoResults-${exoId}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <FaSpinner className="animate-spin text-blue-600 text-3xl" />
      </div>
    );
  }

  if (!exo) {
    return <div className="p-6 text-red-500">Exercice introuvable.</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📝 {exo.title}</h1>
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm">
        {score !== null && total !== null && (
          <div className="mb-6 p-4 bg-blue-100 text-blue-800 rounded-lg">
            <p className="font-semibold">
              Score : {score}/{total}
            </p>
          </div>
        )}

        {exo.questions.map((q, qIdx) => (
          <div key={qIdx} className="space-y-3">
            <p className="font-medium text-lg">
              {qIdx + 1}. {q.question}
            </p>
            {q.options.map((opt, optIdx) => (
              <label
                key={optIdx}
                className={`flex items-center gap-2 p-3 rounded cursor-pointer transition-colors ${
                  results.length > 0
                    ? answers[`${exoId}-${qIdx}`] === optIdx
                      ? opt.isCorrect
                        ? "bg-green-100 border-green-500"
                        : "bg-red-100 border-red-500"
                      : ""
                    : "hover:bg-gray-100"
                }`}
              >
                <input
                  type="radio"
                  name={`${exoId}-${qIdx}`}
                  checked={answers[`${exoId}-${qIdx}`] === optIdx}
                  onChange={() => handleAnswer(qIdx, optIdx)}
                  disabled={results.length > 0}
                />
                <span>{opt.text}</span>
              </label>
            ))}
          </div>
        ))}

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            disabled={results.length > 0 || !exo.questions.every((_, qIdx) => answers[`${exoId}-${qIdx}`] != null)}
          >
            Soumettre
          </button>
          {results.length > 0 && (
            <button
              onClick={handleReset}
              className="mt-4 bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
            >
              Recommencer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

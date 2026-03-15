"use client";

import { useState, useEffect, useCallback } from "react";
import { db, auth } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { FaSpinner, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { mathJaxConfig } from "@/components/admin/utils/mathjaxConfig";
import { logExoProgress } from "@/helpers/activityTracker";

interface Option {
  text: string;
  isCorrect: boolean;
}
interface Question {
  question: string;
  options: Option[];
}
interface Exo {
  id: string;
  title: string;
  questions: Question[];
  courseId: string;
}
interface ExoPlayerProps {
  exoId: string;
  /** courseId requis pour le tracking Firestore */
  courseId: string;
  onNext?: () => void;
  /** Appelé après la soumission réussie — pour marquer l'exo comme complété dans la Sidebar */
  onSubmitted?: () => void;
}

function ensureMathDelimiters(v: string): string {
  const hasInlineMath =
    /\$.*\$/.test(v) || v.includes("\\(") || v.includes("\\[") || v.startsWith("$$");
  return hasInlineMath ? v : `$${v}$`;
}

export default function ExoPlayer({ exoId, courseId, onNext, onSubmitted }: ExoPlayerProps) {
  const [exo, setExo] = useState<Exo | null>(null);
  const [answers, setAnswers] = useState<{ [key: string]: number[] }>({});
  const [results, setResults] = useState<boolean[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [currentQ, setCurrentQ] = useState(0);

  useEffect(() => {
    const fetchExo = async () => {
      if (!exoId) return;
      setIsLoading(true);
      try {
        const exoDoc = await getDoc(doc(db, "app_exercises", exoId));
        if (exoDoc.exists()) setExo({ id: exoDoc.id, ...exoDoc.data() } as Exo);
        else setExo(null);
      } catch (err) {
        console.error("Erreur ExoPlayer:", err);
        setExo(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExo();
  }, [exoId]);

  // ⚡ Restaurer les réponses depuis localStorage (cache rapide)
  useEffect(() => {
    if (!exoId) return;
    const savedAnswers = localStorage.getItem(`exoAnswers-${exoId}`);
    if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
    const savedResults = localStorage.getItem(`exoResults-${exoId}`);
    if (savedResults) setResults(JSON.parse(savedResults));
  }, [exoId]);

  // ⚡ Synchroniser localStorage à chaque changement
  useEffect(() => {
    if (!exoId) return;
    localStorage.setItem(`exoAnswers-${exoId}`, JSON.stringify(answers));
    localStorage.setItem(`exoResults-${exoId}`, JSON.stringify(results));
  }, [answers, results, exoId]);

  const handleAnswer = useCallback(
    (qIdx: number, optIdx: number) => {
      setAnswers((prev) => {
        const key = `${exoId}-${qIdx}`;
        const current = prev[key] || [];
        if (current.includes(optIdx)) {
          return { ...prev, [key]: current.filter((idx) => idx !== optIdx) };
        } else return { ...prev, [key]: [...current, optIdx] };
      });
    },
    [exoId]
  );

  const handleSubmit = useCallback(async () => {
    if (!exo) return;
    let scoreCount = 0;
    const totalQ = exo.questions.length;
    const result: boolean[] = [];

    exo.questions.forEach((q, qIdx) => {
      const chosen = answers[`${exoId}-${qIdx}`] || [];
      const allCorrect = q.options.every(
        (opt, optIdx) => chosen.includes(optIdx) === opt.isCorrect
      );
      if (allCorrect) scoreCount++;
      result.push(allCorrect);
    });

    setResults(result);
    setScore(scoreCount);
    setTotal(totalQ);

    // ⚡ Sauvegarder en Firestore si user connecté
    const user = auth.currentUser;
    if (user) {
      try {
        await logExoProgress({
          userId: user.uid,
          exoId,
          courseId,
          score: scoreCount,
          total: totalQ,
          scorePercent: Math.round((scoreCount / totalQ) * 100),
          answers,
          completedAt: new Date(),
        });
        // ⚡ Notifier page.tsx que l'exo est complété
        onSubmitted?.();
      } catch (err) {
        console.error("Erreur sauvegarde exercice:", err);
        // Ne pas bloquer l'UI si Firestore échoue
      }
    }
  }, [exo, answers, exoId, courseId]);

  const handleReset = () => {
    setAnswers({});
    setResults([]);
    setScore(null);
    setTotal(null);
    setCurrentQ(0);
    localStorage.removeItem(`exoAnswers-${exoId}`);
    localStorage.removeItem(`exoResults-${exoId}`);
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-16">
        <FaSpinner className="animate-spin text-4xl text-teal-600" />
      </div>
    );
  if (!exo)
    return <div className="p-6 text-red-500">Exercice introuvable.</div>;

  const currentQuestion = exo.questions[currentQ];
  const answered = answers[`${exoId}-${currentQ}`] || [];
  const submitted = results.length > 0;

  return (
    <MathJaxContext version={3} config={mathJaxConfig}>
      {/* ⚡ Suppression du transform: scale(0.85) hardcodé — rendu responsive natif */}
      <div className="p-6 w-full max-w-3xl mx-auto bg-gradient-to-br from-[#0D1B2A]/5 via-white to-[#FF9F43]/10 rounded-2xl shadow-lg border border-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-center text-[#0D1B2A]">
          📝 {exo.title}
        </h1>

        {/* Barre de progression */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${((currentQ + 1) / exo.questions.length) * 100}%`,
              background: "linear-gradient(to right, #1B9AAA, #FF9F43)",
            }}
          />
        </div>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Question {currentQ + 1} sur {exo.questions.length}
        </p>

        {/* Question */}
        <div className="bg-white shadow-md p-6 rounded-xl mb-6 border border-gray-100">
          <p className="font-medium text-lg mb-4 text-[#0D1B2A]">
            {currentQ + 1}.{" "}
            <MathJax dynamic>{ensureMathDelimiters(currentQuestion.question)}</MathJax>
          </p>

          <div className="grid grid-cols-1 gap-4">
            {currentQuestion.options.map((opt, optIdx) => {
              const isChecked = answered.includes(optIdx);
              const isCorrect = opt.isCorrect;
              const showResult = submitted;
              return (
                <label
                  key={optIdx}
                  className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all border
                    ${showResult
                      ? isChecked && isCorrect
                        ? "bg-teal-50 border-teal-500"
                        : isChecked && !isCorrect
                          ? "bg-red-50 border-red-400"
                          : isCorrect
                            ? "bg-teal-50/40 border-teal-300"
                            : "border-gray-300"
                      : "hover:bg-teal-50 border-gray-300"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleAnswer(currentQ, optIdx)}
                    disabled={showResult}
                    className="accent-teal-600"
                  />
                  <span className="flex items-center gap-2 text-[#0D1B2A]">
                    <MathJax dynamic>{ensureMathDelimiters(opt.text)}</MathJax>
                    {showResult && isChecked && isCorrect && (
                      <FaCheckCircle className="text-teal-500 flex-shrink-0" />
                    )}
                    {showResult && isChecked && !isCorrect && (
                      <FaTimesCircle className="text-red-400 flex-shrink-0" />
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
            className="bg-gray-200 text-[#0D1B2A] px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition"
            disabled={currentQ === 0}
          >
            ← Précédent
          </button>
          {currentQ < exo.questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ((q) => Math.min(exo.questions.length - 1, q + 1))}
              className="px-6 py-2 rounded-lg shadow text-white transition"
              style={{ background: "linear-gradient(to right, #1B9AAA, #FF9F43)" }}
            >
              Suivant →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 rounded-lg shadow text-white disabled:opacity-50 transition"
              style={{ background: "linear-gradient(to right, #1B9AAA, #FF9F43)" }}
              disabled={submitted}
            >
              Soumettre
            </button>
          )}
        </div>

        {/* Résultats */}
        {score !== null && total !== null && (
          <div
            className="mt-8 p-6 rounded-xl shadow-md text-center"
            style={{
              background: "linear-gradient(135deg, #1B9AAA20, #FF6B6B10, #FF9F4320)",
              border: "1px solid #1B9AAA50",
            }}
          >
            <p className="font-bold text-lg text-[#0D1B2A]">
              Score : {score}/{total} ({Math.round((score / total) * 100)}%)
            </p>
            <p className="mt-2 text-sm text-[#0D1B2A]">
              {score / total >= 0.8
                ? "Excellent 🚀"
                : score / total >= 0.5
                  ? "Bien joué 👌"
                  : "Continue à t'entraîner 💪"}
            </p>
            <p className="mt-1 text-xs text-gray-500">✓ Résultats sauvegardés</p>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={handleReset}
                className="bg-[#0D1B2A] text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition"
              >
                Recommencer
              </button>
              {onNext && (
                <button
                  onClick={onNext}
                  className="px-6 py-2 rounded-lg shadow text-white transition"
                  style={{ background: "linear-gradient(to right, #1B9AAA, #FF9F43)" }}
                >
                  Continuer →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </MathJaxContext>
  );
}
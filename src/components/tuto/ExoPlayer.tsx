"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { FaSpinner, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { mathJaxConfig } from "@/components/admin/utils/mathjaxConfig";

interface Option {
  text: string; // texte en LaTeX
  isCorrect: boolean;
}
interface Question {
  question: string; // texte en LaTeX
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
  onNext?: () => void;
}

// Ajoute automatiquement des délimiteurs si absents
function ensureMathDelimiters(v: string): string {
  const hasInlineMath =
    /\$.*\$/.test(v) || v.includes("\\(") || v.includes("\\[") || v.startsWith("$$");
  return hasInlineMath ? v : `$${v}$`;
}

export default function ExoPlayer({ exoId, onNext }: ExoPlayerProps) {
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

  const handleAnswer = useCallback((qIdx: number, optIdx: number) => {
    setAnswers((prev) => {
      const key = `${exoId}-${qIdx}`;
      const current = prev[key] || [];
      if (current.includes(optIdx)) {
        return { ...prev, [key]: current.filter((idx) => idx !== optIdx) };
      } else return { ...prev, [key]: [...current, optIdx] };
    });
  }, [exoId]);

  const handleSubmit = useCallback(() => {
    if (!exo) return;
    let score = 0;
    const total = exo.questions.length;
    const result: boolean[] = [];

    exo.questions.forEach((q, qIdx) => {
      const chosen = answers[`${exoId}-${qIdx}`] || [];
      const allCorrect = q.options.every(
        (opt, optIdx) => chosen.includes(optIdx) === opt.isCorrect
      );
      if (allCorrect) score++;
      result.push(allCorrect);
    });

    setResults(result);
    setScore(score);
    setTotal(total);
  }, [exo, answers, exoId]);

  const handleReset = () => {
    setAnswers({});
    setResults([]);
    setScore(null);
    setTotal(null);
    setCurrentQ(0);
    localStorage.removeItem(`exoAnswers-${exoId}`);
    localStorage.removeItem(`exoResults-${exoId}`);
  };

  if (isLoading) return <div className="flex justify-center py-16"><FaSpinner className="animate-spin text-4xl text-[#1B9AAA]" /></div>;
  if (!exo) return <div className="p-6 text-[#FF6B6B]">Exercice introuvable.</div>;

  const currentQuestion = exo.questions[currentQ];
  const answered = answers[`${exoId}-${currentQ}`] || [];
  const submitted = results.length > 0;

  return (
    <MathJaxContext version={3} config={mathJaxConfig}>
      <div className="p-6 w-full max-w-3xl mx-auto bg-gradient-to-br from-[#0D1B2A]/5 via-white to-[#FF9F43]/10 rounded-2xl shadow-lg border border-gray-200 origin-top" style={{ transform: "scale(0.85)" }}>
        <h1 className="text-2xl font-bold mb-6 text-center text-[#0D1B2A]">📝 {exo.title}</h1>

        {/* Progression */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div className="h-2 rounded-full transition-all" style={{ width: `${((currentQ + 1) / exo.questions.length) * 100}%`, background: `linear-gradient(to right, #1B9AAA, #FF9F43)` }} />
        </div>
        <p className="text-sm text-gray-600 mb-6 text-center">Question {currentQ + 1} sur {exo.questions.length}</p>

        {/* Question */}
        <div className="bg-white shadow-md p-6 rounded-xl mb-6 border border-gray-100">
          <p className="font-medium text-lg mb-4 text-[#0D1B2A]">
            {currentQ + 1}. <MathJax dynamic>{ensureMathDelimiters(currentQuestion.question)}</MathJax>
          </p>

          <div className="grid grid-cols-1 gap-4">
            {currentQuestion.options.map((opt, optIdx) => {
              const isChecked = answered.includes(optIdx);
              const isCorrect = opt.isCorrect;
              const showResult = submitted;
              return (
                <label key={optIdx} className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all border
                  ${showResult
                    ? isChecked && isCorrect ? "bg-[#1B9AAA]/20 border-[#1B9AAA]" 
                    : isChecked && !isCorrect ? "bg-[#FF6B6B]/20 border-[#FF6B6B]" 
                    : "border-gray-300"
                    : "hover:bg-[#1B9AAA]/10 border-gray-300"}`}>
                  <input type="checkbox" checked={isChecked} onChange={() => handleAnswer(currentQ, optIdx)} disabled={showResult} />
                  <span className="flex items-center gap-2 text-[#0D1B2A]">
                    <MathJax dynamic>{ensureMathDelimiters(opt.text)}</MathJax>
                    {showResult && isChecked && isCorrect && <FaCheckCircle className="text-[#1B9AAA]" />}
                    {showResult && isChecked && !isCorrect && <FaTimesCircle className="text-[#FF6B6B]" />}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-4">
          <button onClick={() => setCurrentQ((q) => Math.max(0, q - 1))} className="bg-gray-200 text-[#0D1B2A] px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50" disabled={currentQ === 0}>← Précédent</button>
          {currentQ < exo.questions.length - 1 ? (
            <button onClick={() => setCurrentQ((q) => Math.min(exo.questions.length - 1, q + 1))} className="px-6 py-2 rounded-lg shadow text-white" style={{ background: "linear-gradient(to right, #1B9AAA, #FF9F43)" }}>Suivant →</button>
          ) : (
            <button onClick={handleSubmit} className="px-6 py-2 rounded-lg shadow text-white disabled:bg-gray-400" style={{ background: "linear-gradient(to right, #1B9AAA, #FF9F43)" }} disabled={submitted}>Soumettre</button>
          )}
        </div>

        {/* Résultats */}
        {score !== null && total !== null && (
          <div className="mt-8 p-6 rounded-xl shadow-md text-center" style={{ background: "linear-gradient(135deg, #1B9AAA20, #FF6B6B10, #FF9F4320)", border: "1px solid #1B9AAA50" }}>
            <p className="font-bold text-lg text-[#0D1B2A]">Score : {score}/{total} ({Math.round((score / total) * 100)}%)</p>
            <p className="mt-2 text-sm text-[#0D1B2A]">{score / total >= 0.8 ? "Excellent 🚀" : score / total >= 0.5 ? "Bien joué 👌" : "Continue à t’entraîner 💪"}</p>
            <div className="flex justify-center gap-3 mt-6">
              <button onClick={handleReset} className="bg-[#0D1B2A] text-white px-6 py-2 rounded-lg hover:bg-[#1B9AAA]">Recommencer</button>
              {onNext && <button onClick={onNext} className="px-6 py-2 rounded-lg shadow text-white" style={{ background: "linear-gradient(to right, #1B9AAA, #FF9F43)" }}>Continuer →</button>}
            </div>
          </div>
        )}
      </div>
    </MathJaxContext>
  );
}

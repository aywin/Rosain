"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FaSpinner, FaArrowLeft } from "react-icons/fa";

interface Option { text: string; isCorrect: boolean; }
interface Question { question: string; options: Option[]; }
interface Exo { id: string; title: string; questions: Question[]; courseId: string; }

export default function ExoDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [exo, setExo] = useState<Exo | null>(null);
  const [answers, setAnswers] = useState<{ [key: string]: number | null }>({});
  const [results, setResults] = useState<boolean[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    const fetchExo = async () => {
      if (!id) {
        console.error("ID de l'exercice manquant dans l'URL");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        console.log("Récupération de l'exercice avec ID :", id);
        const exoDoc = await getDoc(doc(db, "app_exercises", id));
        if (exoDoc.exists()) {
          setExo({ id: exoDoc.id, ...exoDoc.data() } as Exo);
          console.log("Exercice trouvé :", exoDoc.data());
        } else {
          console.error("Aucun exercice trouvé pour l'ID :", id);
        }
      } catch (error) {
        console.error("Erreur lors du chargement de l'exercice :", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExo();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    // Charger les réponses depuis localStorage
    const savedAnswers = localStorage.getItem(`exoAnswers-${id}`);
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    }
    // Charger les résultats depuis localStorage
    const savedResults = localStorage.getItem(`exoResults-${id}`);
    if (savedResults) {
      setResults(JSON.parse(savedResults));
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    // Sauvegarder les réponses dans localStorage
    localStorage.setItem(`exoAnswers-${id}`, JSON.stringify(answers));
    // Sauvegarder les résultats dans localStorage
    localStorage.setItem(`exoResults-${id}`, JSON.stringify(results));
    // Mettre à jour les exercices complétés
    if (results.length > 0) {
      const completedExos = JSON.parse(localStorage.getItem("completedExos") || "[]");
      if (!completedExos.includes(id)) {
        localStorage.setItem("completedExos", JSON.stringify([...completedExos, id]));
      }
    }
  }, [answers, results, id]);

  const handleAnswer = (qIdx: number, optIdx: number) => {
    if (!id) return;
    setAnswers(prev => ({ ...prev, [`${id}-${qIdx}`]: optIdx }));
  };

  const handleSubmit = () => {
    if (!exo || !id) return;
    let score = 0;
    const total = exo.questions.length;
    const result: boolean[] = [];
    exo.questions.forEach((q, qIdx) => {
      const chosen = answers[`${id}-${qIdx}`];
      const isCorrect = chosen != null && q.options[chosen]?.isCorrect;
      if (isCorrect) score++;
      result.push(isCorrect);
    });
    setResults(result);
    setScore(score);
    setTotal(total);
  };

  const handleReset = () => {
    if (!id) return;
    setAnswers({});
    setResults([]);
    setScore(null);
    setTotal(null);
    localStorage.removeItem(`exoAnswers-${id}`);
    localStorage.removeItem(`exoResults-${id}`);
    const completedExos = JSON.parse(localStorage.getItem("completedExos") || "[]");
    localStorage.setItem("completedExos", JSON.stringify(completedExos.filter((exoId: string) => exoId !== id)));
  };

  // Vérifier si toutes les questions ont une réponse
  const isAllAnswered = exo?.questions.every((_, qIdx) => answers[`${id}-${qIdx}`] != null);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <FaSpinner className="animate-spin text-blue-600 text-3xl" />
      </div>
    );
  }

  if (!exo || !id) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-red-500">Exercice introuvable.</p>
        <Link href="/app-exo" className="flex items-center gap-2 text-blue-600 hover:underline">
          <FaArrowLeft /> Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto min-h-screen">
      <Link href="/app-exo" className="flex items-center gap-2 text-blue-600 hover:underline mb-4">
        <FaArrowLeft /> Retour à la liste
      </Link>
      <h1 className="text-3xl font-bold mb-6">{exo.title}</h1>
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm">
        {score !== null && total !== null && (
          <div className="mb-6 p-4 bg-blue-100 text-blue-800 rounded-lg">
            <p className="font-semibold">Score pour "{exo.title}" : {score}/{total}</p>
            <button
              onClick={() => router.push("/app-exo")}
              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Retour à la liste des exercices
            </button>
          </div>
        )}
        {exo.questions.map((q, qIdx) => (
          <div key={qIdx} className="space-y-3">
            <p className="font-medium text-lg">{qIdx + 1}. {q.question}</p>
            {q.options.map((opt, optIdx) => (
              <label
                key={optIdx}
                className={`flex items-center gap-2 p-3 rounded cursor-pointer transition-colors ${
                  results.length > 0
                    ? answers[`${id}-${qIdx}`] === optIdx
                      ? opt.isCorrect
                        ? "bg-green-100 border-green-500"
                        : "bg-red-100 border-red-500"
                      : ""
                    : "hover:bg-gray-100"
                }`}
              >
                <input
                  type="radio"
                  name={`${id}-${qIdx}`}
                  checked={answers[`${id}-${qIdx}`] === optIdx}
                  onChange={() => handleAnswer(qIdx, optIdx)}
                  disabled={results.length > 0}
                  aria-label={`Option ${optIdx + 1} pour la question ${qIdx + 1}`}
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
            disabled={results.length > 0 || !isAllAnswered}
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
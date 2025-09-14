// components/mark/QuizStats.tsx
"use client";
import React from "react";
import { BookOpen, RotateCcw, CheckCircle } from "lucide-react";
import { QuizResponse } from "@/utils/progress";
import { getQuizSuggestion } from "@/utils/progress";

interface Props {
  quizzes: QuizResponse[];
  videoTitles: Record<string, string>;
  quizStats: {
    totalQuizzes: number;
    avgScore: number;
    totalCorrectAnswers: number;
    totalMissedAnswers: number;
  };
}

export default function QuizStats({ quizzes, videoTitles, quizStats }: Props) {
  const suggestion = getQuizSuggestion(quizStats.avgScore);

  return (
    <div className="rounded-lg bg-blue-50 p-4">
      <div className="mb-2 flex items-center space-x-2">
        <BookOpen className="h-5 w-5 text-blue-600" />
        <h3 className="text-xl font-medium text-gray-800">Résumé quizzes</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded bg-blue-100 p-3 text-center">
          <p className="text-sm text-gray-600">Répondus</p>
          <p className="text-2xl font-bold text-blue-600">{quizStats.totalQuizzes}</p>
        </div>
        <div className="rounded bg-green-100 p-3 text-center">
          <p className="text-sm text-gray-600">Correctes</p>
          <p className="text-2xl font-bold text-green-600">{quizStats.totalCorrectAnswers}</p>
        </div>
        <div className="rounded bg-red-100 p-3 text-center">
          <p className="text-sm text-gray-600">Ratées</p>
          <p className="text-2xl font-bold text-red-600">{quizStats.totalMissedAnswers}</p>
        </div>
      </div>

      <p className="mt-4 flex items-center text-sm text-gray-700">
        <RotateCcw className="mr-2 h-4 w-4 text-blue-500" />
        {suggestion}
      </p>

      {/* Détails quizzes */}
      <div className="mt-4">
        <h4 className="text-lg font-medium text-gray-800 mb-2">Détails quizzes</h4>
        {quizzes.length === 0 ? (
          <p className="text-gray-500">Aucune réponse enregistrée.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-gray-50 p-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Quiz ID</th>
                  <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Vidéo</th>
                  <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Score (%)</th>
                  <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map((q) => (
                  <tr key={q.id} className="hover:bg-blue-50 transition-colors">
                    <td className="border-b p-3 text-sm text-gray-600">{q.quizId}</td>
                    <td className="border-b p-3 text-sm text-gray-600">{videoTitles[q.videoId || ""] || q.videoId || "N/A"}</td>
                    <td className="border-b p-3 text-sm text-gray-600">
                      <span className="flex items-center">
                        {q.isCorrect ?? 0}%
                        { (q.isCorrect ?? 0) >= 80 && <CheckCircle className="ml-2 h-4 w-4 text-green-500" /> }
                      </span>
                    </td>
                    <td className="border-b p-3 text-sm text-gray-600">{q.submittedAt?.toDate().toLocaleString() || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

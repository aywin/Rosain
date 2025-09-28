// src/components/mark/QuizStats.tsx
"use client";

import React from "react";
import { BookOpen, RotateCcw, CheckCircle } from "lucide-react";
import {
  QuizResponse,
  getQuizStats,
  getQuizSuggestion,
  AttemptStats,
  QuizStats as QuizStatsType,
} from "@/utils/progress";

interface Props {
  quizzes: QuizResponse[];
  courseTitles?: Record<string, string>; // optionnel pour afficher les noms des cours
}

export default function QuizStats({ quizzes, courseTitles = {} }: Props) {
  if (!quizzes || quizzes.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <BookOpen className="w-6 h-6 mx-auto mb-2" />
        Aucun quiz réalisé pour l’instant.
      </div>
    );
  }

  const statsByCourse: Record<string, QuizStatsType> = getQuizStats(quizzes);

  return (
    <div className="space-y-6">
      {Object.entries(statsByCourse).map(([courseId, stats]) => {
        const first: AttemptStats = stats?.first || {
          totalQuizzes: 0,
          avgScore: 0,
          totalCorrectAnswers: 0,
          totalAnswers: 0,
          totalMissedAnswers: 0,
        };
        const last: AttemptStats = stats?.last || {
          totalQuizzes: 0,
          avgScore: 0,
          totalCorrectAnswers: 0,
          totalAnswers: 0,
          totalMissedAnswers: 0,
        };
        const improvement = stats?.improvement || {
          avgScore: 0,
          totalCorrectAnswers: 0,
          totalMissedAnswers: 0,
        };

        const suggestion = getQuizSuggestion(first.avgScore, last.avgScore);

        return (
          <div key={courseId} className="p-4 bg-white rounded-2xl shadow">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {courseTitles[courseId] || `Cours ${courseId}`}
            </h2>

            {/* Statistiques First / Last */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="font-medium text-sm text-gray-600">Premiers essais</h3>
                <p className="text-xl font-bold text-gray-800">{first.avgScore}%</p>
                <p className="text-xs text-gray-500">
                  {first.totalCorrectAnswers}/{first.totalAnswers} réponses correctes
                </p>
                <p className="text-xs text-gray-400">{first.totalQuizzes} quizzes tentés</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="font-medium text-sm text-gray-600">Reprises</h3>
                <p className="text-xl font-bold text-gray-800">{last.avgScore}%</p>
                <p className="text-xs text-gray-500">
                  {last.totalCorrectAnswers}/{last.totalAnswers} réponses correctes
                </p>
                <p className="text-xs text-gray-400">{last.totalQuizzes} quizzes repris</p>
              </div>
            </div>

            {/* Amélioration */}
            <div className="flex items-center gap-2 mb-4">
              <RotateCcw className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-700">
                Amélioration : {improvement.avgScore} points (
                {improvement.totalCorrectAnswers} bonnes réponses de plus,{" "}
                {improvement.totalMissedAnswers} erreurs de moins)
              </span>
            </div>

            {/* Suggestion */}
            <div className="p-3 bg-green-50 rounded-lg text-sm text-green-800">
              {suggestion}
            </div>
          </div>
        );
      })}
    </div>
  );
}

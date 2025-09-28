// components/mark/CourseStats.tsx
"use client";
import React from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Enrollment, CourseProgress } from "@/utils/progress";

interface Props {
  enrollment: Enrollment;
  courseTitle: string;
  videoPercent: number;
  quizAvg: number;
  courseStatus?: CourseProgress | null;
  isOpen: boolean;
  onToggle: () => void;
}

export default function CourseStats({
  enrollment,
  courseTitle,
  videoPercent,
  quizAvg,
  courseStatus,
  isOpen,
  onToggle,
}: Props) {
  // Détermination du statut du cours
  const getStatusLabel = () => {
    switch (courseStatus?.status) {
      case "done":
        return <span className="text-green-600 font-medium">Terminé</span>;
      case "in_progress":
        return <span className="text-blue-600 font-medium">En cours</span>;
      default:
        return <span className="text-orange-600 font-medium">Non commencé</span>;
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={onToggle}
      >
        {/* Infos cours */}
        <div className="flex items-center space-x-4">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">{courseTitle}</h2>
            <div className="flex flex-col sm:flex-row sm:space-x-6 text-sm text-gray-600">
              <p>
                Inscrit le :{" "}
                {enrollment.date_inscription?.toDate().toLocaleDateString() || "N/A"}
              </p>
              <p>Statut : {getStatusLabel()}</p>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="flex items-center space-x-6">
          {/* Progression vidéos */}
          <div className="text-right">
            <p className="text-sm font-medium text-gray-600">Progression vidéos</p>
            <p className="text-lg font-bold text-gray-800">
              {Number(videoPercent || 0).toFixed(0)}%
            </p>
            <div className="mt-1 h-2 w-28 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-green-500 transition-all"
                style={{ width: `${videoPercent}%` }}
              />
            </div>
          </div>

          {/* Moyenne quizzes */}
          <div className="text-right">
            <p className="text-sm font-medium text-gray-600">Score quizzes</p>
            <p className="text-lg font-bold text-gray-800">{quizAvg.toFixed(0)}%</p>
            <div className="mt-1 h-2 w-28 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all"
                style={{ width: `${quizAvg}%` }}
              />
            </div>
          </div>

          {/* Toggle */}
          {isOpen ? (
            <ChevronUp className="h-6 w-6 text-gray-600" />
          ) : (
            <ChevronDown className="h-6 w-6 text-gray-600" />
          )}
        </div>
      </div>
    </div>
  );
}

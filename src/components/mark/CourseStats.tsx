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
  return (
    <div>
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-4">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">{courseTitle}</h2>
            <div className="flex space-x-4 text-sm text-gray-600">
              <p>
                Inscrit le :{" "}
                {enrollment.date_inscription?.toDate().toLocaleString() || "N/A"}
              </p>
              <p
                className={`font-medium ${
                  courseStatus?.status === "done"
                    ? "text-green-600"
                    : courseStatus?.status === "in_progress"
                    ? "text-blue-600"
                    : "text-orange-600"
                }`}
              >
                Statut :{" "}
                {courseStatus?.status === "done"
                  ? "Terminé"
                  : courseStatus?.status === "in_progress"
                  ? "En cours"
                  : "Non commencé"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-600">Progression vidéos</p>
            <p className="text-lg font-bold text-gray-800">
              {Number(videoPercent || 0).toFixed(0)}%
            </p>
            <div className="mt-1 h-2 w-24 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-green-500"
                style={{ width: `${videoPercent}%` }}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-600">Score quizzes</p>
            <p className="text-lg font-bold text-gray-800">{quizAvg}%</p>
            <div className="mt-1 h-2 w-24 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${quizAvg}%` }}
              />
            </div>
          </div>
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

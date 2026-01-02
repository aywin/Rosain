"use client";

import { MathJax } from "better-react-mathjax";
import React, { useRef, useEffect } from "react";
import { FaBookOpen, FaCheckCircle, FaTag, FaRobot, FaFileAlt, FaLightbulb } from "react-icons/fa";
import { preprocessLatex, needsDisplay } from "@/components/admin/utils/latexUtils";

interface Level { id: string; name: string; }
interface Subject { id: string; name: string; }
interface Course { id: string; title: string; subject_id: string; level_id: string; }

interface Exo {
  id: string;
  title: string;
  description?: string;
  difficulty?: string;
  level_id?: string;
  subject_id?: string;
  course_ids?: string[];
  statement_text?: string;
  solution_text?: string;
  statement_files?: string[];
  solution_files?: string[];
  tags?: string[];
  order?: number;
}

interface ExoCardProps {
  exo: Exo;
  levels: Level[];
  subjects: Subject[];
  courses: Course[];
  openStatementIds: Set<string>;
  openSolutionIds: Set<string>;
  toggleStatement: (id: string) => void;
  toggleSolution: (id: string) => void;
  onAssistantClick?: (exoContext: any) => void;
  isSelectedForAssistant?: boolean;
  onToggleSelection?: (exoId: string) => void;
}

/** Rendering texte + LaTeX (sans conversion Markdown) */
/** Rendering texte + LaTeX (version simplifiée comme LatexPreview) */
const renderParagraphs = (text?: string) => {
  if (!text) return null;

  const processedText = preprocessLatex(text);

  const paragraphs = processedText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return paragraphs.map((p, i) => {
    // ✅ Détection simple pour espacement
    const isDisplayBlock = p.startsWith("\\[") || p.startsWith("$$");

    return (
      <div
        key={i}
        className={`text-sm leading-relaxed ${isDisplayBlock ? "my-4 text-center" : "mb-3"}`}
      >
        <MathJax dynamic hideUntilTypeset="first">
          {p}  {/* ← Pas de manipulation, juste le texte preprocessé */}
        </MathJax>
      </div>
    );
  });
};

export default function ExoCard({
  exo,
  levels,
  subjects,
  courses,
  openStatementIds,
  openSolutionIds,
  toggleStatement,
  toggleSolution,
  onAssistantClick,
  isSelectedForAssistant = false,
  onToggleSelection,
}: ExoCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.userSelect = "text";
      containerRef.current.style.webkitUserSelect = "text";
    }
  }, []);

  const diffColors: Record<string, string> = {
    facile: "bg-green-100 text-green-700",
    moyen: "bg-yellow-100 text-yellow-700",
    difficile: "bg-red-100 text-red-700",
  };

  const handleAssistantClick = () => {
    if (onAssistantClick) {
      const level = levels.find((l) => l.id === exo.level_id);
      const subject = subjects.find((s) => s.id === exo.subject_id);

      if (onToggleSelection && !isSelectedForAssistant) {
        onToggleSelection(exo.id);
      }

      onAssistantClick({
        id: exo.id,
        title: exo.title,
        statement: exo.statement_text,
        solution: exo.solution_text,
        difficulty: exo.difficulty,
        tags: exo.tags,
        level: level?.name,
        subject: subject?.name,
      });
    }
  };

  const statementOpen = openStatementIds.has(exo.id);
  const solutionOpen = openSolutionIds.has(exo.id);

  return (
    <div
      ref={containerRef}
      className={`border rounded-xl shadow-md hover:shadow-lg transition bg-white flex flex-col overflow-hidden relative ${isSelectedForAssistant ? "border-green-500 border-2 ring-2 ring-green-200" : ""
        }`}
    >
      {/* Badge "Actif" */}
      {isSelectedForAssistant && (
        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg z-10 flex items-center gap-1">
          <FaRobot size={12} />
          <span>Actif</span>
        </div>
      )}

      {/* Checkbox assistant */}
      {onToggleSelection && (
        <div className="px-4 pt-3 pb-2 border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <label className="flex items-center gap-2 cursor-pointer hover:text-green-700 transition">
            <input
              type="checkbox"
              checked={isSelectedForAssistant}
              onChange={() => onToggleSelection(exo.id)}
              className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
            />
            <span className="text-sm font-medium flex items-center gap-1">
              <FaRobot className="text-green-600" size={14} />
              Inclure dans l'assistant IA
            </span>
          </label>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-blue-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="font-semibold text-lg">
              {exo.order ? `Exercice ${exo.order} : ` : ""}{exo.title}
            </h2>
            {exo.course_ids && exo.course_ids.length > 1 && (
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full border border-purple-300">
                  🔗 {exo.course_ids.length} cours
                </span>
                {exo.course_ids.map(courseId => {
                  const course = courses.find(c => c.id === courseId);
                  return course ? (
                    <span key={courseId} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {course.title}
                    </span>
                  ) : null;
                })}
              </div>
            )}
            {exo.description && <p className="text-gray-600 text-sm mt-1">{exo.description}</p>}
            {exo.difficulty && (
              <span
                className={`inline-block text-xs px-2 py-0.5 mt-2 rounded ${diffColors[exo.difficulty] || "bg-gray-200"
                  }`}
              >
                {exo.difficulty.charAt(0).toUpperCase() + exo.difficulty.slice(1)}
              </span>
            )}
          </div>

          {onAssistantClick && (
            <button
              onClick={handleAssistantClick}
              className="ml-4 flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition text-sm"
              title="Ouvrir l'assistant IA"
            >
              <FaRobot />
              <span>Assistant</span>
            </button>
          )}
        </div>
      </div>

      {/* Infos */}
      <div className="flex flex-wrap gap-2 text-xs text-gray-600 mt-2 px-4">
        {exo.level_id && (
          <span className="bg-gray-200 px-2 py-0.5 rounded">
            {levels.find((l) => l.id === exo.level_id)?.name}
          </span>
        )}
        {exo.subject_id && (
          <span className="bg-gray-200 px-2 py-0.5 rounded">
            {subjects.find((s) => s.id === exo.subject_id)?.name}
          </span>
        )}
        {exo.course_ids && (
          <span className="bg-gray-200 px-2 py-0.5 rounded">
            {courses.find((c) => c.id === exo.course_ids?.[0])?.title}
          </span>
        )}
      </div>

      {/* Tags */}
      {exo.tags && exo.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-2 pb-2 border-t mt-2">
          {exo.tags.map((tag, i) => (
            <span
              key={i}
              className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs flex items-center gap-1"
            >
              <FaTag className="text-xs" /> {tag}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="p-4 border-t space-y-3">
        {/* Statement */}
        {exo.statement_text && (
          <>
            <button
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm w-full transition"
              onClick={() => toggleStatement(exo.id)}
            >
              <FaBookOpen />
              {statementOpen ? "Cacher l'énoncé" : "Voir l'énoncé"}
            </button>

            {statementOpen && (
              <div className="p-4 bg-gray-50 rounded-lg mt-2">
                <h4 className="font-semibold mb-3 text-center text-base flex items-center justify-center gap-2">
                  <FaFileAlt className="text-blue-600" />
                  Énoncé
                </h4>
                <div className="space-y-2">{renderParagraphs(exo.statement_text)}</div>

                {exo.statement_files?.map((file, i) => (
                  <a
                    key={i}
                    href={file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-xs flex items-center gap-1 mt-2"
                  >
                    <FaFileAlt size={12} />
                    Télécharger l'énoncé
                  </a>
                ))}
              </div>
            )}
          </>
        )}

        {/* Solution */}
        {exo.solution_text && (
          <>
            <button
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm w-full transition"
              onClick={() => toggleSolution(exo.id)}
            >
              <FaCheckCircle />
              {solutionOpen ? "Cacher la solution" : "Voir la solution"}
            </button>

            {solutionOpen && (
              <div className="p-4 bg-green-50 rounded-lg mt-2">
                <h4 className="font-semibold mb-3 text-center text-base flex items-center justify-center gap-2">
                  <FaLightbulb className="text-green-600" />
                  Solution
                </h4>
                <div className="space-y-2">{renderParagraphs(exo.solution_text)}</div>

                {exo.solution_files?.map((file, i) => (
                  <a
                    key={i}
                    href={file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-xs flex items-center gap-1 mt-2"
                  >
                    <FaFileAlt size={12} />
                    Télécharger la solution
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
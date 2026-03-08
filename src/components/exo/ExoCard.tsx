"use client";

import { MathJax } from "better-react-mathjax";
import React, { useRef, useEffect } from "react";
import { FaBookOpen, FaCheckCircle, FaTag, FaFileAlt, FaLightbulb, FaBrain } from "react-icons/fa";
import { preprocessLatex } from "@/components/admin/utils/latexUtils";

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

const renderParagraphs = (text?: string) => {
  if (!text) return null;
  const processedText = preprocessLatex(text);
  const paragraphs = processedText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return paragraphs.map((p, i) => {
    const isDisplayBlock = p.startsWith("\\[") || p.startsWith("$$");
    return (
      <div key={i} className={`text-sm leading-relaxed ${isDisplayBlock ? "my-4 text-center" : "mb-3"}`}>
        <MathJax dynamic hideUntilTypeset="first">{p}</MathJax>
      </div>
    );
  });
};

const getPreviewParagraphs = (text?: string, maxParagraphs = 2): string | null => {
  if (!text) return null;
  const processedText = preprocessLatex(text);
  const paragraphs = processedText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (paragraphs.length === 0) return null;
  const preview = paragraphs.slice(0, maxParagraphs).join("\n\n");
  return paragraphs.length > maxParagraphs ? preview + "\n\n…" : preview;
};

const diffColors: Record<string, string> = {
  facile: "bg-emerald-400 text-white",
  moyen: "bg-amber-400 text-white",
  difficile: "bg-red-500 text-white",
};

export default function ExoCard({
  exo, levels, subjects, courses,
  openStatementIds, openSolutionIds,
  toggleStatement, toggleSolution,
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

  const statementOpen = openStatementIds.has(exo.id);
  const solutionOpen = openSolutionIds.has(exo.id);
  const previewText = getPreviewParagraphs(exo.statement_text, 2);

  const level = levels.find(l => l.id === exo.level_id);
  const subject = subjects.find(s => s.id === exo.subject_id);
  const firstCourse = courses.find(c => c.id === exo.course_ids?.[0]);

  const metaItems = [level?.name, subject?.name, firstCourse?.title].filter(Boolean);

  return (
    <div
      ref={containerRef}
      className={`rounded-xl overflow-hidden transition-all duration-200 border-l-4 border-r-4 border-t border-b ${isSelectedForAssistant
        ? "border-teal-800 shadow-lg ring-2 ring-teal-200"
        : "border-teal-700 shadow-sm hover:shadow-md"
        }`}
    >
      {/* ── ZONE 1 : HEADER — teal-700 ── */}
      <div className="bg-teal-700">

        {/* Ligne titre + numéro + difficulté */}
        <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            {exo.order && (
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {exo.order}
              </span>
            )}
            {/* Titre souligné */}
            <h2 className="font-semibold text-white text-base leading-snug underline underline-offset-4 decoration-white/50">
              {exo.title}
            </h2>
          </div>
          {exo.difficulty && (
            <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${diffColors[exo.difficulty] || "bg-white/20 text-white"}`}>
              {exo.difficulty.charAt(0).toUpperCase() + exo.difficulty.slice(1)}
            </span>
          )}
        </div>

        {/* Bandeau unique niveau · matière · cours */}
        {metaItems.length > 0 && (
          <div className="bg-teal-800/40 px-4 py-2 flex items-center gap-2 flex-wrap">
            {metaItems.map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-teal-400 text-xs">·</span>}
                <span className="text-xs text-teal-100">{item}</span>
              </React.Fragment>
            ))}
            {exo.course_ids && exo.course_ids.length > 1 && (
              <span className="text-xs text-teal-300 ml-1">+{exo.course_ids.length - 1} cours</span>
            )}
          </div>
        )}

        {/* Tags */}
        {exo.tags && exo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-3 pt-2">
            {exo.tags.map((tag, i) => (
              <span key={i} className="flex items-center gap-1 text-xs text-teal-100 bg-white/20 px-2 py-0.5 rounded-full">
                <FaTag size={9} />{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── ZONE 2 : APERÇU — fond blanc ── */}
      {previewText && !statementOpen && (
        <div className="px-5 py-4 bg-white text-gray-700 text-sm leading-relaxed">
          <MathJax dynamic hideUntilTypeset="first">
            {previewText}
          </MathJax>
        </div>
      )}

      {/* ── ZONE 3 : ACTIONS — teal-700 ── */}
      <div className="px-4 py-3 bg-teal-700 space-y-3">
        <div className="flex items-center gap-2">

          {/* Énoncé — teal clair */}
          {exo.statement_text && (
            <button
              onClick={() => toggleStatement(exo.id)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition flex-1 ${statementOpen
                ? "bg-white text-teal-800 font-semibold shadow"
                : "bg-teal-600 hover:bg-teal-500 text-white border border-white/30"
                }`}
            >
              <FaBookOpen size={11} />
              {statementOpen ? "Cacher l'énoncé" : "Énoncé"}
            </button>
          )}

          {/* Solution — emerald distinct */}
          {exo.solution_text && (
            <button
              onClick={() => toggleSolution(exo.id)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition flex-1 ${solutionOpen
                ? "bg-emerald-400 text-white font-semibold shadow"
                : "bg-emerald-600 hover:bg-emerald-500 text-white border border-white/30"
                }`}
            >
              <FaCheckCircle size={11} />
              {solutionOpen ? "Cacher la solution" : "Solution"}
            </button>
          )}

          {/* Checkbox IA */}
          {onToggleSelection && (
            <label className="flex items-center gap-1.5 cursor-pointer group flex-shrink-0 ml-1">
              <input
                type="checkbox"
                checked={isSelectedForAssistant}
                onChange={() => onToggleSelection(exo.id)}
                className="w-3.5 h-3.5 accent-white cursor-pointer"
              />
              <span className="text-xs text-teal-100 group-hover:text-white transition flex items-center gap-1">
                <FaBrain size={10} className="text-teal-200 group-hover:text-white transition" />
                <span className="hidden sm:inline">
                  {isSelectedForAssistant ? "Dans l'IA" : "Ajouter à l'IA"}
                </span>
              </span>
            </label>
          )}
        </div>

        {/* Énoncé déplié */}
        {statementOpen && (
          <div className="p-4 bg-white rounded-lg">
            <h4 className="font-semibold mb-3 text-center text-sm flex items-center justify-center gap-2 text-gray-700">
              <FaFileAlt className="text-teal-600" size={12} /> Énoncé
            </h4>
            <div>{renderParagraphs(exo.statement_text)}</div>
            {exo.statement_files?.map((file, i) => (
              <a key={i} href={file} target="_blank" rel="noopener noreferrer"
                className="text-teal-600 hover:text-teal-800 underline text-xs flex items-center gap-1 mt-2">
                <FaFileAlt size={11} /> Télécharger l'énoncé
              </a>
            ))}
          </div>
        )}

        {/* Solution dépliée */}
        {solutionOpen && (
          <div className="p-4 bg-white rounded-lg">
            <h4 className="font-semibold mb-3 text-center text-sm flex items-center justify-center gap-2 text-gray-700">
              <FaLightbulb className="text-emerald-500" size={12} /> Solution
            </h4>
            <div>{renderParagraphs(exo.solution_text)}</div>
            {exo.solution_files?.map((file, i) => (
              <a key={i} href={file} target="_blank" rel="noopener noreferrer"
                className="text-teal-600 hover:text-teal-800 underline text-xs flex items-center gap-1 mt-2">
                <FaFileAlt size={11} /> Télécharger la solution
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
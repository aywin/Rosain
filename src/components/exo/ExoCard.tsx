"use client";

import { MathJax, MathJaxContext } from "better-react-mathjax";
import React, { useRef, useEffect } from "react";
import { FaBookOpen, FaCheckCircle, FaTag } from "react-icons/fa";

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
  course_id?: string;
  statement_text?: string;
  solution_text?: string;
  statement_files?: string[];
  solution_files?: string[];
  tags?: string[];
}

interface ExoCardProps {
  exo: Exo;
  levels: Level[];
  subjects: Subject[];
  courses: Course[];
  openStatementId: string | null;
  openSolutionId: string | null;
  setOpenStatementId: (id: string | null) => void;
  setOpenSolutionId: (id: string | null) => void;
}

const mathjaxConfig = { /* (ton config identique) */ };

const renderParagraphs = (text?: string) => {
  if (!text) return null;
  return text.split(/\n{2,}/).map((p, i) => (
    <p key={i} className="mb-3 text-sm leading-snug">
      <MathJax dynamic>{p}</MathJax>
    </p>
  ));
};

export default function ExoCard({
  exo, levels, subjects, courses,
  openStatementId, openSolutionId,
  setOpenStatementId, setOpenSolutionId
}: ExoCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.userSelect = "text";
    }
  }, []);

  // Couleur difficulté
  const diffColors: Record<string, string> = {
    facile: "bg-green-100 text-green-700",
    moyen: "bg-yellow-100 text-yellow-700",
    difficile: "bg-red-100 text-red-700"
  };

  return (
    <MathJaxContext config={mathjaxConfig} version={3}>
      <div
        ref={containerRef}
        className="border rounded-xl shadow-md hover:shadow-lg transition bg-white flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-blue-100">
          <h2 className="font-semibold text-lg">{exo.title}</h2>
          {exo.description && <p className="text-gray-600 text-sm mt-1">{exo.description}</p>}

          {/* Difficulty */}
          {exo.difficulty && (
            <span className={`inline-block text-xs px-2 py-0.5 mt-2 rounded ${diffColors[exo.difficulty] || "bg-gray-200"}`}>
              {exo.difficulty.charAt(0).toUpperCase() + exo.difficulty.slice(1)}
            </span>
          )}
        </div>

{/* Infos : niveau / matière / cours */}
<div className="flex flex-wrap gap-2 text-xs text-gray-600 mt-2 px-4">
  {exo.level_id && (
    <span className="bg-gray-200 px-2 py-0.5 rounded">{levels.find(l => l.id === exo.level_id)?.name}</span>
  )}
  {exo.subject_id && (
    <span className="bg-gray-200 px-2 py-0.5 rounded">{subjects.find(s => s.id === exo.subject_id)?.name}</span>
  )}
  {exo.course_id && (
    <span className="bg-gray-200 px-2 py-0.5 rounded">{courses.find(c => c.id === exo.course_id)?.title}</span>
  )}
</div>

{/* Tags */}
{exo.tags && exo.tags.length > 0 && (
  <div className="flex flex-wrap gap-2 px-4 pt-2 pb-2 border-t mt-2">
    {exo.tags.map((tag, i) => (
      <span key={i} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
        <FaTag className="text-xs" /> {tag}
      </span>
    ))}
  </div>
)}



        {/* Buttons & Content */}
        <div className="p-4 border-t space-y-3">
          {/* Statement */}
          {exo.statement_text && (
            <>
              <button
                className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm w-full transition"
                onClick={() => setOpenStatementId(openStatementId === exo.id ? null : exo.id)}
              >
                <FaBookOpen />
                {openStatementId === exo.id ? "Cacher l’énoncé" : "Voir l’énoncé"}
              </button>
              {openStatementId === exo.id && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm leading-snug mt-2">
                  <h4 className="font-semibold mb-2 text-center">📘 Énoncé</h4>
                  {renderParagraphs(exo.statement_text)}
                  {exo.statement_files?.map((file, i) => (
                    <a key={i} href={file} target="_blank" className="text-blue-600 underline text-xs block mt-1">📂 Télécharger l’énoncé</a>
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
                onClick={() => setOpenSolutionId(openSolutionId === exo.id ? null : exo.id)}
              >
                <FaCheckCircle />
                {openSolutionId === exo.id ? "Cacher la solution" : "Voir la solution"}
              </button>
              {openSolutionId === exo.id && (
                <div className="p-3 bg-green-50 rounded-lg text-sm leading-snug mt-2">
                  <h4 className="font-semibold mb-2 text-center">✅ Solution</h4>
                  {renderParagraphs(exo.solution_text)}
                  {exo.solution_files?.map((file, i) => (
                    <a key={i} href={file} target="_blank" className="text-blue-600 underline text-xs block mt-1">📂 Télécharger la solution</a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MathJaxContext>
  );
}

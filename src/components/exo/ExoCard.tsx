"use client";

import { MathJax, MathJaxContext } from "better-react-mathjax";
import React, { useRef, useEffect } from "react";

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

const mathjaxConfig = {
  loader: { load: ["input/tex", "output/chtml", "[tex]/textmacros", "[tex]/noerrors", "[tex]/noundefined"] },
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true,
    processEnvironments: true,
    packages: { "[+]": ["base", "ams", "amscd", "color", "newcommand", "physics", "mathtools", "cancel"] },
    macros: {
      R: "\\mathbb{R}",
      N: "\\mathbb{N}",
      Z: "\\mathbb{Z}",
      Q: "\\mathbb{Q}",
      C: "\\mathbb{C}",
      vect: ["{\\overrightarrow{#1}}", 1],
      abs: ["\\left|#1\\right|", 1],
      norm: ["\\left\\lVert#1\\right\\rVert", 1],
      bar: ["\\overline{#1}", 1],
      textbf: ["\\mathbf{#1}", 1],
      textit: ["\\textit{#1}", 1],
      bigskip: ["\\vspace{1em}", 0],
    },
  },
  chtml: { scale: 1 },
};

const renderParagraphs = (text?: string) => {
  if (!text) return null;
  return text
    .split(/\n{2,}/)
    .map((p, i) => p.trim())
    .filter(Boolean)
    .map((p, i) => (
      <p key={i} className="mb-4 text-sm leading-snug">
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
      containerRef.current.style.webkitUserSelect = "text";
    }
  }, [exo.statement_text, exo.solution_text]);

  return (
    <MathJaxContext config={mathjaxConfig} version={3}>
      <div ref={containerRef} className="border rounded-lg shadow-sm hover:shadow-md transition bg-white flex flex-col">
        {/* Header */}
        <div className="p-3 flex-1 flex flex-col">
          <h2 className="font-semibold text-base">{exo.title}</h2>
          {exo.description && <p className="text-gray-600 text-xs mt-0.5">{exo.description}</p>}

          {/* Infos */}
          <div className="text-xs text-gray-700 mt-1 space-y-0.5">
            {exo.level_id && <p><span className="font-medium">Niveau :</span> {levels.find(l => l.id === exo.level_id)?.name}</p>}
            {exo.subject_id && <p><span className="font-medium">Matière :</span> {subjects.find(s => s.id === exo.subject_id)?.name}</p>}
            {exo.course_id && <p><span className="font-medium">Cours :</span> {courses.find(c => c.id === exo.course_id)?.title}</p>}
          </div>

          {/* Difficulty */}
          {exo.difficulty && (
            <span
              className={`inline-block text-xs px-2 py-0.5 mt-1 rounded ${
                exo.difficulty === "facile" ? "bg-green-100 text-green-700" :
                exo.difficulty === "moyen" ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              }`}
            >
              {exo.difficulty.charAt(0).toUpperCase() + exo.difficulty.slice(1)}
            </span>
          )}

          {/* Tags */}
          {exo.tags && exo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {exo.tags.map((tag, i) => (
                <span key={i} className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-xs">#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Buttons & Content */}
        <div className="p-3 border-t space-y-1">
          {/* Statement */}
          {exo.statement_text && (
            <>
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm w-full"
                onClick={() => setOpenStatementId(openStatementId === exo.id ? null : exo.id)}
              >
                {openStatementId === exo.id ? "Cacher l’énoncé" : "Voir l’énoncé"}
              </button>
              {openStatementId === exo.id && (
                <div className="p-2 bg-gray-50 rounded text-sm leading-snug mt-1">
                  <h4 className="font-semibold mb-1 text-center">Énoncé</h4>
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
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm w-full"
                onClick={() => setOpenSolutionId(openSolutionId === exo.id ? null : exo.id)}
              >
                {openSolutionId === exo.id ? "Cacher la solution" : "Voir la solution"}
              </button>
              {openSolutionId === exo.id && (
                <div className="p-2 bg-green-50 rounded text-sm leading-snug mt-1">
                  <h4 className="font-semibold mb-1 text-center">Solution</h4>
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

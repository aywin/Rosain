"use client";

import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import React from "react";

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

// 🔑 Rendu KaTeX compact (comme LatexPreview)
const renderWithKatex = (text: string = "") => {
  const paragraphs = (text || "").split(/\n{2,}/).filter(p => p.length > 0);

  return paragraphs.map((p, key) => {
    // Bloc math pur $$...$$
    const blockMatch = p.match(/^\s*\$\$([\s\S]*)\$\$\s*$/);
    if (blockMatch) {
      return (
        <div key={key} className="my-0 text-center">
          <BlockMath>{blockMatch[1].trim()}</BlockMath>
        </div>
      );
    }

    // Texte avec éventuelles maths inline
    const parts = p.split(/(\$[^$]+\$)/g).filter(Boolean);

    return (
      <p key={key} className="m-0 text-sm leading-snug">
        {parts.map((seg, i) => {
          if (seg.startsWith("$") && seg.endsWith("$")) {
            return <InlineMath key={i}>{seg.slice(1, -1)}</InlineMath>;
          } else {
            const lines = seg.split("\n");
            return lines.map((ln, idx) => (
              <React.Fragment key={i + "-" + idx}>
                {ln}
                {idx < lines.length - 1 ? <br /> : null}
              </React.Fragment>
            ));
          }
        })}
      </p>
    );
  });
};

export default function ExoCard({
  exo, levels, subjects, courses,
  openStatementId, openSolutionId,
  setOpenStatementId, setOpenSolutionId
}: ExoCardProps) {
  return (
    <div className="border rounded-lg shadow-sm hover:shadow-md transition bg-white flex flex-col">
      {/* Header Exo */}
      <div className="p-3 flex-1 flex flex-col">
        <h2 className="font-semibold text-base">{exo.title}</h2>
        {exo.description && (
          <p className="text-gray-600 text-xs mt-0.5">{exo.description}</p>
        )}

        {/* Infos */}
        <div className="text-xs text-gray-700 mt-1 space-y-0.5">
          {exo.level_id && (
            <p><span className="font-medium">Niveau :</span> {levels.find(l => l.id === exo.level_id)?.name}</p>
          )}
          {exo.subject_id && (
            <p><span className="font-medium">Matière :</span> {subjects.find(s => s.id === exo.subject_id)?.name}</p>
          )}
          {exo.course_id && (
            <p><span className="font-medium">Cours :</span> {courses.find(c => c.id === exo.course_id)?.title}</p>
          )}
        </div>

        {/* Difficulté */}
        {exo.difficulty && (
          <span
            className={`inline-block text-xs px-2 py-0.5 mt-1 rounded ${
              exo.difficulty === "facile"
                ? "bg-green-100 text-green-700"
                : exo.difficulty === "moyen"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {exo.difficulty.charAt(0).toUpperCase() + exo.difficulty.slice(1)}
          </span>
        )}

        {/* Tags */}
        {exo.tags && exo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {exo.tags.map((tag, i) => (
              <span
                key={i}
                className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Boutons & contenu */}
      <div className="p-3 border-t space-y-1">
        {/* Énoncé */}
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
                {renderWithKatex(exo.statement_text)}
                {exo.statement_files?.[0] && (
                  <a
                    href={exo.statement_files[0]}
                    target="_blank"
                    className="text-blue-600 underline text-xs block mt-1"
                  >
                    📂 Télécharger l’énoncé
                  </a>
                )}
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
                {renderWithKatex(exo.solution_text)}
                {exo.solution_files?.[0] && (
                  <a
                    href={exo.solution_files[0]}
                    target="_blank"
                    className="text-blue-600 underline text-xs block mt-1"
                  >
                    📂 Télécharger la solution
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

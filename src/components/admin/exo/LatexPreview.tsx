"use client";

import { MathJax, MathJaxContext } from "better-react-mathjax";
import React, { useRef, useEffect } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export default function LatexPreview({
  label,
  value,
  onChange,
  placeholder,
}: Props) {
  const config = {
    loader: { load: ["input/tex", "output/chtml", "[tex]/textmacros", "[tex]/noerrors", "[tex]/noundefined"] },
    tex: {
      inlineMath: [["$", "$"], ["\\(", "\\)"]],
      displayMath: [["$$", "$$"], ["\\[", "\\]"]],
      processEscapes: true,
      processEnvironments: true,
      packages: { "[+]": ["base", "ams", "amscd", "color", "newcommand"] },
      macros: {
        R: "\\mathbb{R}",
        N: "\\mathbb{N}",
        Z: "\\mathbb{Z}",
        Q: "\\mathbb{Q}",
        C: "\\mathbb{C}",
        vect: ["{\\overrightarrow{#1}}", 1], // \vect{AB}
        abs: ["\\left|#1\\right|", 1],      // \abs{x}
        norm: ["\\left\\lVert#1\\right\\rVert", 1], // \norm{u}
        bar: ["\\overline{#1}", 1],         // \bar{ABC} pour barycentre
        textbf: ["\\mathbf{#1}", 1],        // \textbf{texte} -> gras via MathJax
        bigskip: ["\\vspace{1em}", 0],      // \bigskip -> espace vertical via MathJax
      },
    },
  };

  // Référence pour le conteneur de preview
  const previewRef = useRef<HTMLDivElement>(null);

  // Effet pour s'assurer que le contenu est sélectionnable
  useEffect(() => {
    if (previewRef.current) {
      // Supprimer tout style qui pourrait bloquer la sélection
      previewRef.current.style.userSelect = "text";
      previewRef.current.style.webkitUserSelect = "text"; // Pour Safari
    }
  }, [value]);

  // Découper par double saut de ligne, préserver les structures LaTeX
  const paragraphs = value
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg shadow-sm">
      <label className="text-md font-semibold text-gray-700">{label}</label>

      {/* Zone de saisie */}
      <textarea
        className="border border-gray-300 px-4 py-3 rounded-lg w-full text-base leading-relaxed min-h-[300px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      {/* Aperçu copiable */}
      <div
        ref={previewRef}
        className="border border-gray-200 rounded-lg bg-white p-4 mt-2 text-base leading-relaxed select-text"
      >
        {value && value.trim() ? (
          <MathJaxContext version={3} config={config}>
            {paragraphs.map((p, i) => (
              <p key={i} className="mb-4" style={{ marginBottom: p.includes("\\bigskip") ? "1em" : "inherit" }}>
                <MathJax dynamic>{p}</MathJax>
              </p>
            ))}
          </MathJaxContext>
        ) : (
          <span className="text-gray-500 italic">Entrez du code LaTeX pour un aperçu...</span>
        )}
      </div>
    </div>
  );
}
"use client";

import { MathJax, MathJaxContext } from "better-react-mathjax";
import React, { useRef, useEffect, useMemo } from "react";
import { mathJaxConfig } from "@/components/admin/utils/mathjaxConfig";

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
  const previewRef = useRef<HTMLDivElement>(null);

  // Rendre le contenu sélectionnable
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.style.userSelect = "text";
      (previewRef.current.style as any).webkitUserSelect = "text";
    }
  }, [value]);

  // Découper en paragraphes par double saut de ligne
  const paragraphs = useMemo(
    () =>
      value
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    [value]
  );

  // Détection des blocs display (systèmes, align, matrices, équations)
  const needsDisplay = (text: string) =>
    /(\\begin\{(cases|aligned|array|matrix|bmatrix|pmatrix)\})|\\sys|\\align|\\\[|\\\]|^\$\$|\\bigskip/.test(
      text
    );

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

      {/* Aperçu MathJax */}
      <div
        ref={previewRef}
        className="border border-gray-200 rounded-lg bg-white p-4 mt-2 text-base leading-relaxed select-text"
      >
        {value && value.trim() ? (
          <MathJaxContext key={value} config={mathJaxConfig}>
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className="mb-4"
                style={{
                  marginBottom: p.includes("\\bigskip") ? "1em" : "inherit",
                }}
              >
                <MathJax dynamic>
                  {needsDisplay(p) ? `$$${p}$$` : p}
                </MathJax>
              </p>
            ))}
          </MathJaxContext>
        ) : (
          <span className="text-gray-500 italic">
            Entrez du code LaTeX pour un aperçu...
          </span>
        )}
      </div>
    </div>
  );
}

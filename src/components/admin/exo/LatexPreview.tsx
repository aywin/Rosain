//LatexPreview.tsx
"use client";

import { MathJax } from "better-react-mathjax";
import React, { useRef, useEffect, useMemo } from "react";
import { preprocessLatex } from "@/components/admin/utils/latexUtils";

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

/**
 * Convertit le Markdown en HTML
 * Gère **texte** → <strong>texte</strong>
 * Gère *texte* → <em>texte</em>
 */
const convertMarkdownToHtml = (text: string): string => {
  let html = text;

  // Convertir **texte** en <strong>texte</strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Convertir *texte* en <em>texte</em> (attention aux ** déjà traités)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  return html;
};

export default function LatexPreview({
  label,
  value,
  onChange,
  placeholder,
}: Props) {
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.style.userSelect = "text";
      previewRef.current.style.webkitUserSelect = "text";
    }
  }, [value]);

  const paragraphs = useMemo(() => {
    if (!value) return [];
    const processed = preprocessLatex(value);
    return processed
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }, [value]);

  return (
    <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg shadow-sm">
      <label className="text-md font-semibold text-gray-700">{label}</label>

      {/* Zone de saisie */}
      <textarea
        className="border border-gray-300 px-4 py-3 rounded-lg w-full text-base leading-relaxed min-h-[300px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />

      {/* Aperçu MathJax */}
      <div
        ref={previewRef}
        className="border border-gray-200 rounded-lg bg-white p-4 mt-2 text-base leading-relaxed select-text min-h-[100px] markdown-content"
      >
        {value && value.trim() ? (
          paragraphs.map((p, i) => {
            return (
              <div
                key={i}
                className="mb-4 last:mb-0"
              >
                <MathJax dynamic hideUntilTypeset="first">
                  {p}
                </MathJax>
              </div>
            );
          })
        ) : (
          <span className="text-gray-500 italic">
            Entrez du code LaTeX pour un aperçu...
          </span>
        )}
      </div>
    </div>
  );
}
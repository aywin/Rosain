"use client";

import { MathJax, MathJaxContext } from "better-react-mathjax";
import React, { useRef, useEffect } from "react";
import { mathJaxConfig } from "@/components/admin/utils/mathjaxConfig";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

// Ajoute $...$ uniquement si nécessaire
function ensureMathDelimiters(v: string): string {
  const hasInlineMath =
    /\$.*\$/.test(v) ||
    v.includes("\\(") ||
    v.includes("\\[") ||
    v.startsWith("$$");

  return hasInlineMath ? v : `$${v}$`;
}

export default function LatexInput({ value, onChange, placeholder }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);

  // Autoriser la sélection du rendu
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.style.userSelect = "text";
      previewRef.current.style.webkitUserSelect = "text";
    }
  }, [value]);

  return (
    <div className="flex flex-col gap-1">
      {/* Champ de saisie compact */}
      <input
        type="text"
        className="border border-gray-300 rounded px-2 py-1 text-sm w-full font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      {/* Aperçu compact */}
      {value && value.trim() && (
        <div
          ref={previewRef}
          className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm text-blue-700 select-text"
        >
          <MathJaxContext config={mathJaxConfig}>
            <MathJax dynamic>{ensureMathDelimiters(value)}</MathJax>
          </MathJaxContext>
        </div>
      )}
    </div>
  );
}

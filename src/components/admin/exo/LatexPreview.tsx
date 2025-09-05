"use client";

import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import React from 'react';

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export default function LatexPreview({ label, value, onChange, placeholder }: Props) {
  // On découpe le texte en paragraphes avec double saut de ligne
  const paragraphs = (value || '').split(/\n{2,}/).filter(p => p.length > 0);

  // Fonction pour rendre chaque paragraphe
  const renderParagraph = (p: string, key: number) => {
    // Cas bloc math $$...$$ (multi-lignes incluses)
    const blockMatch = p.match(/^\s*\$\$([\s\S]*)\$\$\s*$/);
    if (blockMatch) {
      return (
        <div key={key} className="my-0">
          <BlockMath>{blockMatch[1].trim()}</BlockMath>
        </div>
      );
    }

    // Sinon, c’est du texte avec éventuellement des maths inline $...$
    const parts = p.split(/(\$[^$]+\$)/g).filter(Boolean);

    return (
      <p key={key} className="m-0 text-sm leading-snug">
        {parts.map((seg, i) => {
          if (seg.startsWith('$') && seg.endsWith('$')) {
            // Cas inline math
            const inner = seg.slice(1, -1);
            return <InlineMath key={i}>{inner}</InlineMath>;
          } else {
            // Cas texte normal → on garde les sauts de ligne simples
            const lines = seg.split('\n');
            return lines.map((ln, idx) => (
              <React.Fragment key={i + '-' + idx}>
                {ln}
                {idx < lines.length - 1 ? <br /> : null}
              </React.Fragment>
            ));
          }
        })}
      </p>
    );
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium">{label}</label>

      <textarea
  className="border px-3 py-2 rounded w-full text-sm leading-tight min-h-[250px] font-serif"
  placeholder={placeholder}
  value={value}
  onChange={(e) => onChange(e.target.value)}
/>


      {/* Aperçu */}
      <div className="border rounded bg-white p-3 mt-1 text-sm leading-snug">
        {value && value.trim() ? (
          paragraphs.map((p, i) => renderParagraph(p, i))
        ) : (
          <span className="text-gray-400">Aperçu LaTeX ici...</span>
        )}
      </div>
    </div>
  );
}

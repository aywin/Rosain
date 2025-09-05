// utils/renderLatex.tsx
import { BlockMath, InlineMath } from "react-katex";
import React from "react";

export function renderLatexCompact(text: string = "") {
  const paragraphs = (text || "").split(/\n{2,}/).filter(p => p.length > 0);

  return paragraphs.map((p, key) => {
    // Bloc LaTeX
    const blockMatch = p.match(/^\s*\$\$([\s\S]*)\$\$\s*$/);
    if (blockMatch) {
      return (
        <div key={key} className="my-0">
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
}

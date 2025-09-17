// utils/mathjaxConfig.ts

export const mathJaxConfig = {
  loader: {
    load: [
      "input/tex",
      "output/chtml",
      "[tex]/textmacros",
      "[tex]/noerrors",
      "[tex]/noundefined",
    ],
  },
  tex: {
    inlineMath: [
      ["$", "$"],
      ["\\(", "\\)"],
    ],
    displayMath: [
      ["$$", "$$"],
      ["\\[", "\\]"],
    ],
    processEscapes: true,
    processEnvironments: true,
    packages: { "[+]": ["base", "ams", "amscd", "color", "newcommand"] },

    // 📌 Macros personnalisées
    macros: {
      // Ensembles usuels
      R: "\\mathbb{R}",
      N: "\\mathbb{N}",
      Z: "\\mathbb{Z}",
      Q: "\\mathbb{Q}",
      C: "\\mathbb{C}",

      // Analyse
      d: "\\mathrm{d}", // différentielle
      dx: "\\,\\mathrm{d}x",
      dy: "\\,\\mathrm{d}y",
      dz: "\\,\\mathrm{d}z",
      esp: ["\\mathbb{E}\\left[#1\\right]", 1], // espérance
      var: ["\\mathrm{Var}\\left(#1\\right)", 1], // variance
      prob: ["\\mathbb{P}\\left(#1\\right)", 1], // probabilité
      cov: ["\\mathrm{Cov}\\left(#1,#2\\right)", 2], // covariance

      // Algèbre / matrices
      trans: ["#1^{\\mathsf{T}}", 1], // transpose
      id: "\\mathrm{Id}",

      // Géométrie
      vect: ["{\\overrightarrow{#1}}", 1], // vecteur
      norm: ["\\left\\lVert#1\\right\\rVert", 1], // norme
      abs: ["\\left|#1\\right|", 1], // valeur absolue
      bar: ["\\overline{#1}", 1], // segment / barycentre

      // Mise en forme
      textbf: ["\\mathbf{#1}", 1], // texte gras
      bigskip: ["\\vspace{1em}", 0], // saut vertical
    },
  },
};

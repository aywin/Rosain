export const mathJaxConfig = {
  loader: {
    load: [
      "input/tex",
      "output/chtml",
      "[tex]/textmacros",
      "[tex]/noerrors",
      "[tex]/noundefined",
      "[tex]/ams",       // pour align, cases, split...
      "[tex]/amscd",
      "[tex]/mathtools", // pour pmatrix*, bmatrix*, etc.
    ],
  },
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true,
    processEnvironments: true,
    packages: {
      "[+]": ["base", "ams", "amscd", "mathtools", "color", "newcommand"],
    },
    macros: {
      // Ensembles
      R: "\\mathbb{R}",
      N: "\\mathbb{N}",
      Z: "\\mathbb{Z}",
      Q: "\\mathbb{Q}",
      C: "\\mathbb{C}",

      // Analyse
      d: "\\mathrm{d}", // différentielle
      esp: ["\\mathbb{E}\\left[#1\\right]", 1],
      var: ["\\mathrm{Var}\\left(#1\\right)", 1],
      prob: ["\\mathbb{P}\\left(#1\\right)", 1],
      cov: ["\\mathrm{Cov}\\left(#1,#2\\right)", 2],

      // Algèbre / matrices
      trans: ["#1^{\\mathsf{T}}", 1],
      id: "\\mathrm{Id}",
      det: ["\\det\\left(#1\\right)", 1],
      mat: ["\\begin{bmatrix}#1\\end{bmatrix}", 1],

      // Systèmes / alignements
      sys: ["\\left\\{\\begin{array}{l}#1\\end{array}\\right.", 1],
      align: ["\\begin{aligned}#1\\end{aligned}", 1],
      cases: ["\\begin{cases}#1\\end{cases}", 1],

      // Fractions
      frac: ["\\dfrac{#1}{#2}", 2],
      pfrac: ["\\tfrac{#1}{#2}", 2], // petite fraction inline

      // Géométrie
      vect: ["{\\overrightarrow{#1}}", 1],
      norm: ["\\left\\lVert#1\\right\\rVert", 1],
      abs: ["\\left|#1\\right|", 1],
      bar: ["\\overline{#1}", 1],

      // Logique / ensembles
      forall: "\\forall",
      exists: "\\exists",
      not: "\\neg",
      in: "\\in",
      notin: "\\notin",
      subset: "\\subset",
      subseteq: "\\subseteq",
      supset: "\\supset",
      supseteq: "\\supseteq",
      union: "\\cup",
      inter: "\\cap",
      impl: "\\Rightarrow",
      equiv: "\\Leftrightarrow",

      // Mise en forme
      textbf: ["\\mathbf{#1}", 1],
      textit: ["\\mathit{#1}", 1],
      uline: ["\\underline{#1}", 1],
      bigskip: ["\\vspace{1em}", 0],
    },
  },
};

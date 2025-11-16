export const mathJaxConfig = {
  loader: {
    load: [
      "input/tex",
      "output/chtml",
      "[tex]/textmacros",
      "[tex]/noerrors",
      "[tex]/noundefined",
      "[tex]/ams",
      "[tex]/amscd",
      "[tex]/mathtools",
      "[tex]/color",
      "[tex]/boldsymbol",
      "[tex]/html",
    ],
  },

  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true,
    processEnvironments: true,

    packages: {
      "[+]": ["ams", "amscd", "mathtools", "color", "boldsymbol", "textmacros", "html"],
    },

    macros: {
      // ============================================
      // Ensembles classiques
      // ============================================
      R: "\\mathbb{R}",
      N: "\\mathbb{N}",
      Z: "\\mathbb{Z}",
      Q: "\\mathbb{Q}",
      C: "\\mathbb{C}",
      K: "\\mathbb{K}",
      P: "\\mathbb{P}",

      // ============================================
      // Analyse et Probabilités
      // ============================================
      d: "\\mathrm{d}",
      esp: ["\\mathbb{E}\\left[#1\\right]", 1],
      vari: ["\\mathrm{Var}\\left(#1\\right)", 1],  // Renommé pour éviter conflit
      prob: ["\\mathbb{P}\\left(#1\\right)", 1],
      cov: ["\\mathrm{Cov}\\left(#1,#2\\right)", 2],

      // ============================================
      // Algèbre linéaire
      // ============================================
      trans: ["#1^{\\mathsf{T}}", 1],
      id: "\\mathrm{Id}",
      deter: ["\\det\\left(#1\\right)", 1],  // Renommé
      mat: ["\\begin{bmatrix}#1\\end{bmatrix}", 1],
      tr: ["\\mathrm{tr}\\left(#1\\right)", 1],
      rg: ["\\mathrm{rg}\\left(#1\\right)", 1],

      // ============================================
      // Systèmes et alignements
      // ============================================
      sys: ["\\left\\{\\begin{array}{l}#1\\end{array}\\right.", 1],
      // align retiré car conflit avec environnement natif

      // ============================================
      // Fractions (utiliser \dfrac et \tfrac natifs)
      // ============================================
      // frac et pfrac retirés - utiliser \dfrac et \tfrac

      // ============================================
      // Géométrie et vecteurs
      // ============================================
      vect: ["\\overrightarrow{#1}", 1],
      norm: ["\\left\\lVert#1\\right\\rVert", 1],
      abs: ["\\left|#1\\right|", 1],
      // bar, hat, tilde retirés - utiliser \overline, \widehat, \widetilde natifs

      // ============================================
      // Logique (symboles natifs - pas besoin de macro)
      // ============================================
      impl: "\\Rightarrow",
      equiv: "\\Leftrightarrow",
      ssi: "\\Leftrightarrow",

      // ============================================
      // Ensembles - opérations
      // ============================================
      comp: "^{\\mathsf{c}}",
      card: ["\\left|#1\\right|", 1],

      // ============================================
      // Mise en forme texte
      // ============================================
      bold: ["\\textbf{#1}", 1],
      uline: ["\\underline{#1}", 1],

      // ============================================
      // Mise en forme mathématique
      // ============================================
      mbf: ["\\boldsymbol{#1}", 1],

      // ============================================
      // Délimiteurs automatiques
      // ============================================
      paren: ["\\left(#1\\right)", 1],
      brac: ["\\left[#1\\right]", 1],
      set: ["\\left\\{#1\\right\\}", 1],
      ang: ["\\left\\langle#1\\right\\rangle", 1],

      // ============================================
      // Limites et dérivées (raccourcis personnalisés)
      // ============================================
      limite: ["\\lim\\limits_{#1 \\to #2}", 2],
      derive: ["\\frac{\\mathrm{d}#1}{\\mathrm{d}#2}", 2],
      partielle: ["\\frac{\\partial #1}{\\partial #2}", 2],

      // ============================================
      // Intégrales
      // ============================================
      integrale: ["\\int_{#1}^{#2} #3 \\, \\mathrm{d}#4", 4],

      // ============================================
      // Probabilités (alias)
      // ============================================
      proba: ["\\mathbb{P}\\left(#1\\right)", 1],
      esperance: ["\\mathbb{E}\\left[#1\\right]", 1],
      variance: ["\\mathrm{Var}\\left(#1\\right)", 1],

      // ============================================
      // Suites et séries
      // ============================================
      suite: ["\\left(#1\\right)_{#2}", 2],
      somme: ["\\sum\\limits_{#1}^{#2}", 2],
      produit: ["\\prod\\limits_{#1}^{#2}", 2],

      // ============================================
      // Complexité
      // ============================================
      Oo: ["\\mathcal{O}\\left(#1\\right)", 1],
      oo: ["o\\left(#1\\right)", 1],

      // ============================================
      // Divers
      // ============================================
      ceil: ["\\left\\lceil#1\\right\\rceil", 1],
      floor: ["\\left\\lfloor#1\\right\\rfloor", 1],
      pgcd: ["\\mathrm{pgcd}\\left(#1\\right)", 1],
      ppcm: ["\\mathrm{ppcm}\\left(#1\\right)", 1],
    },
  },

  chtml: {
    scale: 1,
    minScale: 0.5,
    mtextInheritFont: true,
    merrorInheritFont: true,
  },

  options: {
    enableMenu: false,
    skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"],
    ignoreHtmlClass: "tex2jax_ignore",
    processHtmlClass: "tex2jax_process",
  },
};
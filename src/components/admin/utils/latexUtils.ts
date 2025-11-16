/**
 * Utilitaires pour le traitement LaTeX
 * À placer dans: src/components/admin/utils/latexUtils.ts
 */

/**
 * Prétraite le texte LaTeX pour compatibilité MathJax
 * Convertit les commandes LaTeX brutes en format compatible MathJax/HTML
 */
export const preprocessLatex = (text: string): string => {
    let processed = text;

    // Protection : extraire temporairement les blocs math pour éviter toute manipulation
    const mathBlocks: string[] = [];
    const mathPlaceholder = '___MATH_BLOCK_';

    // 1. Protéger les blocs display math \[...\]
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match) => {
        mathBlocks.push(match);
        return `${mathPlaceholder}${mathBlocks.length - 1}___`;
    });

    // 2. Protéger les blocs display math $$...$$
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
        mathBlocks.push(match);
        return `${mathPlaceholder}${mathBlocks.length - 1}___`;
    });

    // 3. Protéger les blocs inline math $...$
    processed = processed.replace(/\$([^$]+)\$/g, (match) => {
        mathBlocks.push(match);
        return `${mathPlaceholder}${mathBlocks.length - 1}___`;
    });

    // 4. Protéger les blocs inline math \(...\)
    processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (match) => {
        mathBlocks.push(match);
        return `${mathPlaceholder}${mathBlocks.length - 1}___`;
    });

    // Maintenant on peut manipuler le texte normal sans risque

    // 5. Le Markdown ** et * sont laissés tels quels
    // Ils seront interprétés par le moteur de rendu
    // (pas de transformation nécessaire)

    // 6. Convertir les listes enumerate en listes numérotées
    processed = processed.replace(
        /\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g,
        (_, content) => {
            const items = content
                .split(/\\item\s+/)
                .filter((s: string) => s.trim())
                .map((item: string, idx: number) => `${idx + 1}. ${item.trim()}`)
                .join('\n\n');
            return '\n' + items + '\n';
        }
    );

    // 7. Convertir les listes itemize en listes à puces
    processed = processed.replace(
        /\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,
        (_, content) => {
            const items = content
                .split(/\\item\s+/)
                .filter((s: string) => s.trim())
                .map((item: string) => `• ${item.trim()}`)
                .join('\n\n');
            return '\n' + items + '\n';
        }
    );

    // 8. Gérer \bigskip comme double saut de ligne
    processed = processed.replace(/\\bigskip/g, '\n\n');

    // 9. Gérer \medskip
    processed = processed.replace(/\\medskip/g, '\n');

    // 10. Nettoyer les espaces multiples à la fin des lignes
    processed = processed.replace(/[ \t]+$/gm, '');

    // 11. Nettoyer les multiples sauts de ligne (3+ → 2)
    processed = processed.replace(/\n{3,}/g, '\n\n');

    // 12. Restaurer les blocs math dans leur forme originale
    mathBlocks.forEach((block, index) => {
        const placeholder = `${mathPlaceholder}${index}___`;
        processed = processed.replace(placeholder, block);
    });

    // 13. Normaliser les espaces autour des blocs display math
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, '\n\\[$1\\]\n');

    // 14. Trim final
    processed = processed.trim();

    return processed;
};

/**
 * Détecte si un texte nécessite un affichage en mode "display math"
 * (équations centrées, environnements mathématiques, etc.)
 */
export const needsDisplay = (text: string): boolean => {
    return /\\(begin\{(cases|aligned|array|matrix|bmatrix|pmatrix|vmatrix|Vmatrix)\}|sys|align|\[|\])|\$\$/.test(text);
};

/**
 * Nettoie le texte LaTeX des commandes non supportées
 */
export const sanitizeLatex = (text: string): string => {
    let cleaned = text;

    // Supprimer les commentaires LaTeX
    cleaned = cleaned.replace(/(?<!\\)%.*$/gm, '');

    // Supprimer les espaces multiples
    cleaned = cleaned.replace(/  +/g, ' ');

    return cleaned.trim();
};

/**
 * Extrait les équations display math d'un texte
 */
export const extractDisplayMath = (text: string): string[] => {
    const regex = /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]/g;
    const matches: string[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        matches.push(match[1] || match[2]);
    }

    return matches;
};

/**
 * Extrait les équations inline math d'un texte
 */
export const extractInlineMath = (text: string): string[] => {
    const regex = /\$([^$]+)\$|\\\(([^)]+)\\\)/g;
    const matches: string[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        matches.push(match[1] || match[2]);
    }

    return matches;
};

/**
 * Compte le nombre d'équations dans un texte
 */
export const countEquations = (text: string): { display: number; inline: number } => {
    return {
        display: extractDisplayMath(text).length,
        inline: extractInlineMath(text).length,
    };
};
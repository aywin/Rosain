// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
    "./app/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "oklch(97% 0.01 260)",  // blanc cassé (clair)
        foreground: "oklch(25% 0.02 260)",  // bleu nuit (clair)

        dark: {
          background: "oklch(20% 0.02 250)", // bleu nuit profond
          foreground: "oklch(97% 0 260)",    // blanc
        },

        primary: {
          DEFAULT: "oklch(65% 0.15 250)",    // bleu feuille (clair)
          dark: "oklch(60% 0.15 250)",       // bleu plus vif (dark)
          foreground: "oklch(97% 0 260)",    // texte lisible
        },

        secondary: {
          DEFAULT: "oklch(75% 0.16 145)",    // vert feuille (clair)
          dark: "oklch(65% 0.18 145)",       // vert vif (dark)
          foreground: "oklch(25% 0.02 260)", // texte foncé
        },

        muted: {
          DEFAULT: "oklch(92% 0.01 250)",
          foreground: "oklch(45% 0.02 250)",
        },

        border: "oklch(88% 0.01 250)",
        ring: "oklch(55% 0.12 250)",
        destructive: "oklch(50% 0.15 25)",
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.625rem",
        xl: "0.75rem",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

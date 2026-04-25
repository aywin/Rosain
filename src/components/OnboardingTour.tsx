"use client";

import { useEffect, useRef } from "react";
import "driver.js/dist/driver.css";

const TOUR_KEY = "rosaine_tour_done";

const STEPS = [
    {
        element: "#hero-explore-btn",
        popover: {
            title: "🚀 Explorer les cours",
            description: "Clique ici pour accéder à tous les cours disponibles sur la plateforme.",
            side: "bottom" as const,
            align: "center" as const,
        },
    },
    {
        element: "#nav-explorer",
        popover: {
            title: "📚 Explorer",
            description: "Parcours le catalogue complet : filtre par matière, niveau ou chapitre.",
            side: "bottom" as const,
            align: "start" as const,
        },
    },
    {
        element: "#nav-mon-travail",
        popover: {
            title: "📁 Mon travail",
            description: "Retrouve ici tous tes cours en cours, ta progression et tes exercices.",
            side: "bottom" as const,
            align: "start" as const,
        },
    },
    {
        element: "#explainer-videos",
        popover: {
            title: "🎬 Vidéos de présentation",
            description: "Regarde ces courtes vidéos pour comprendre comment utiliser la plateforme.",
            side: "top" as const,
            align: "center" as const,
        },
    },
    {
        element: "#explainer-guide",
        popover: {
            title: "📖 Guide d'utilisation",
            description: "Suis ces 4 étapes simples pour bien démarrer sur Rosaine Academy.",
            side: "top" as const,
            align: "center" as const,
        },
    },
];

export default function OnboardingTour() {
    const driverRef = useRef<any>(null);

    const startTour = async () => {
        const { driver } = await import("driver.js");

        driverRef.current = driver({
            showProgress: true,
            progressText: "Étape {{current}} sur {{total}}",
            nextBtnText: "Suivant →",
            prevBtnText: "← Précédent",
            doneBtnText: "Terminer ✓",
            steps: STEPS,
            onDestroyed: () => {
                localStorage.setItem(TOUR_KEY, "true");
            },
        });

        driverRef.current.drive();
    };

    // Démarre automatiquement au premier chargement
    useEffect(() => {
        const alreadySeen = localStorage.getItem(TOUR_KEY);
        if (!alreadySeen) {
            // Petit délai pour laisser la page se rendre
            const timer = setTimeout(() => startTour(), 800);
            return () => clearTimeout(timer);
        }
    }, []);

    return (
        <>
            {/* Bouton flottant "?" pour relancer le tour */}
            <button
                onClick={startTour}
                title="Relancer le guide"
                className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-white font-bold text-xl transition-all duration-200 hover:scale-110 hover:shadow-2xl"
                style={{ backgroundColor: "#0D9488" }}
            >
                ?
            </button>
        </>
    );
}
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import CourseSection from "@/components/CourseSection";

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();

  // Couleurs ajustées
  const colors = {
    darkBlue: "#25364C",   // Fond du logo
    white: "#FFFFFF",      // Texte
    primaryBlue: "#1F77B0", // Bleu accent
    primaryGreen: "#65B04E", // Vert accent
    lightGray: "#F9FAFB",   // Fond clair sections
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) setRole(snap.data().role?.trim() || null);
      } else {
        setUser(null);
        setRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleExploreCourses = () => {
    if (user) router.push("/courses");
    else router.push("/login");
  };

  return (
    <main style={{ backgroundColor: colors.white }} className="min-h-screen text-gray-800">
      {/* Hero Section */}
      <section
        style={{ backgroundColor: colors.darkBlue, color: colors.white }}
        className="py-20 px-6 text-center rounded-b-3xl shadow-lg"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-white">
          Bienvenue sur Rosaine Academy
        </h1>
        <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-gray-200">
          Apprenez à votre rythme grâce à des cours vidéo de qualité, des quiz interactifs et un suivi personnalisé.
        </p>
        <button
          onClick={handleExploreCourses}
          style={{ backgroundColor: colors.primaryBlue, color: colors.white }}
          className="inline-block px-6 py-3 rounded-xl font-medium shadow hover:bg-[#155E8B] transition"
        >
          Explorer les cours
        </button>
      </section>

      {/* Avantages */}
      <section style={{ backgroundColor: colors.lightGray }} className="py-20 px-6">
        <h2 style={{ color: colors.darkBlue }} className="text-3xl md:text-4xl font-semibold text-center mb-12">
          Pourquoi nous choisir ?
        </h2>
        <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
          {[
            { emoji: "🎓", title: "Cours de qualité", desc: "Des vidéos claires et pédagogiques, créées par des enseignants passionnés." },
            { emoji: "🧠", title: "Quiz interactifs", desc: "Testez vos connaissances avec des quiz ludiques et instantanés." },
            { emoji: "📈", title: "Suivi intelligent", desc: "Votre progression est enregistrée pour vous proposer le bon contenu au bon moment." },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white text-gray-800 p-6 rounded-2xl shadow-md border border-gray-200"
            >
              <h3
                className="text-xl font-semibold mb-2"
                style={{ color: colors.primaryGreen }}
              >
                {item.emoji} {item.title}
              </h3>
              <p className="text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section des cours */}
      <CourseSection />

      {/* Call to action */}
      <section
        style={{ backgroundColor: colors.darkBlue }}
        className="text-white py-16 px-6 text-center rounded-t-3xl shadow-lg mt-12"
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-white">
          Commencez dès aujourd'hui à apprendre autrement
        </h2>
        <button
          onClick={() => router.push("/signup")}
          style={{ backgroundColor: colors.white, color: colors.primaryBlue }}
          className="inline-block px-6 py-3 rounded-xl font-semibold shadow hover:bg-gray-100 transition"
        >
          Créer un compte
        </button>
      </section>
    </main>
  );
}

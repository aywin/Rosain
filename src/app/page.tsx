// front/src/app/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import CourseSection from "@/components/CourseSection";
import StatsSection from "@/components/GlobalStats";

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();

  const colors = {
    darkBlue: "#25364C",
    white: "#FFFFFF",
    primaryBlue: "#1F77B0",
    primaryGreen: "#65B04E",
    lightGray: "#F9FAFB",
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
      {/* Hero Section avec image de fond */}
      <div className="px-5 py-6">
        <section
          className="relative py-20 px-6 text-center overflow-hidden rounded-3xl"
          style={{
            backgroundImage: "linear-gradient(rgba(37, 54, 76, 0.75), rgba(37, 54, 76, 0.85)), url('https://cdn.pixabay.com/photo/2015/07/17/22/43/student-849825_1280.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            minHeight: "400px",
          }}
        >
          <div className="relative z-10 max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight text-white drop-shadow-2xl">
              Bienvenue sur Rosaine Academy
            </h1>
            <p className="text-base md:text-lg lg:text-xl mb-8 text-white leading-relaxed drop-shadow-lg">
              Apprenez à votre rythme grâce à des cours vidéo de qualité, des quiz interactifs et un suivi personnalisé.
            </p>
            <button
              onClick={handleExploreCourses}
              style={{ backgroundColor: colors.primaryBlue }}
              className="inline-block px-8 py-4 rounded-xl font-semibold text-white text-lg shadow-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              Explorer les cours
            </button>
          </div>
        </section>
      </div>

      {/* Avantages */}
      <section style={{ backgroundColor: colors.lightGray }} className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 style={{ color: colors.darkBlue }} className="text-3xl md:text-4xl font-semibold text-center mb-12">
            Pourquoi nous choisir ?
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { emoji: "🎓", title: "Cours de qualité", desc: "Des vidéos claires et pédagogiques, créées par des enseignants passionnés." },
              { emoji: "🧠", title: "Quiz interactifs", desc: "Testez vos connaissances avec des quiz ludiques et instantanés." },
              { emoji: "📈", title: "Suivi intelligent", desc: "Votre progression est enregistrée pour vous proposer le bon contenu au bon moment." },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white text-gray-800 p-8 rounded-2xl shadow-md border border-gray-200 hover:shadow-xl transition-shadow duration-300"
              >
                <h3
                  className="text-2xl font-semibold mb-3"
                  style={{ color: colors.primaryGreen }}
                >
                  {item.emoji} {item.title}
                </h3>
                <p className="text-base leading-relaxed text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section des cours */}
      <CourseSection />

      {/* Section des statistiques */}
      <StatsSection />

      {/* Call to action */}
      <section
        style={{ backgroundColor: colors.darkBlue }}
        className="text-white py-20 px-6 text-center"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
            Commencez dès aujourd'hui à apprendre autrement
          </h2>
          <button
            onClick={() => router.push("/signup")}
            style={{ backgroundColor: colors.white, color: colors.primaryBlue }}
            className="inline-block px-8 py-4 rounded-xl font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-lg"
          >
            Créer un compte
          </button>
        </div>
      </section>
    </main>
  );
}
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        // récupérer le rôle depuis Firestore
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
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="bg-primary text-[oklch(25%_0.02_250)] py-20 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Bienvenue sur votre plateforme éducative
        </h1>
        <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
          Apprenez à votre rythme grâce à des cours vidéo de qualité, des quiz interactifs et un suivi personnalisé.
        </p>
        <button
          onClick={handleExploreCourses}
          className="inline-block bg-[oklch(60%_0.14_350)] text-white px-6 py-3 rounded-xl font-medium shadow hover:opacity-90 transition"
        >
          Explorer les cours
        </button>
      </section>

      {/* Avantages */}
      <section className="py-20 px-6 bg-[oklch(97%_0.04_350)] text-[oklch(25%_0.02_250)]">
        <h2 className="text-3xl md:text-4xl font-semibold text-center mb-12">
          Pourquoi nous choisir ?
        </h2>
        <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
          {[
            { emoji: "🎓", title: "Cours de qualité", desc: "Des vidéos claires et pédagogiques, créées par des enseignants passionnés." },
            { emoji: "🧠", title: "Quiz interactifs", desc: "Testez vos connaissances avec des quiz ludiques et instantanés." },
            { emoji: "📈", title: "Suivi intelligent", desc: "Votre progression est enregistrée pour vous proposer le bon contenu au bon moment." },
          ].map((item, i) => (
            <div key={i} className="bg-white text-[oklch(30%_0.02_250)] p-6 rounded-2xl shadow-md border border-[oklch(92%_0.01_345)]">
              <h3 className="text-xl font-semibold mb-2">{item.emoji} {item.title}</h3>
              <p className="text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section des cours */}
      <CourseSection />

  

      {/* Appel à l'action */}
      <section className="bg-[oklch(60%_0.14_350)] text-white py-16 px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">
          Commencez dès aujourd'hui à apprendre autrement
        </h2>
        <button
          onClick={() => router.push("/signup")}
          className="inline-block bg-white text-[oklch(60%_0.14_350)] px-6 py-3 rounded-xl font-semibold shadow hover:bg-opacity-90 transition"
        >
          Créer un compte
        </button>
      </section>
    </main>
  );
}

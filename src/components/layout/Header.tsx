// src/components/layout/Header.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import LogoutButton from "@/components/auth/LogoutButton";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  return (
    <header className="flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 mb-8">
      <div className="flex items-center gap-4">
        <span
          className="font-bold text-2xl text-blue-700 cursor-pointer"
          onClick={() => router.push("/")}
        >
          <span className="mr-1">📘</span>
          TutosHub
        </span>
        <button
          className="text-blue-700 hover:underline"
          onClick={() => router.push("/courses")}
        >
          Tous les cours
        </button>
      </div>
      <nav className="flex items-center gap-3">
        {!user ? (
          <>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              onClick={() => router.push("/login")}
            >
              Connexion
            </button>
            <button
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              onClick={() => router.push("/signup")}
            >
              Inscription
            </button>
          </>
        ) : (
          <>
            <button
              className="hover:bg-gray-100 px-3 py-1 rounded"
              onClick={() => router.push("/mycourses")}
            >
              📚 Mes cours
            </button>
            <button
              className="hover:bg-gray-100 px-3 py-1 rounded"
              onClick={() => router.push("/profile")}
            >
              👤 Mon profil
            </button>
            <LogoutButton />
          </>
        )}
      </nav>
    </header>
  );
}

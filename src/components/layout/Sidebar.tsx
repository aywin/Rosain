"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import LogoutButton from "@/components/auth/LogoutButton";

export default function Sidebar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  return (
    <aside className="w-64 h-screen bg-white shadow-md flex flex-col p-6">
      <h2 className="text-2xl font-bold mb-8 cursor-pointer" onClick={() => router.push("/")}>
        TutosHub
      </h2>
      {!user ? (
        <div className="flex flex-col gap-2">
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => router.push("/login")}>
            Connexion
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={() => router.push("/signup")}>
            Inscription
          </button>
        </div>
      ) : (
        <>
          <nav className="flex flex-col gap-2 mb-6">
            <button className="text-left px-2 py-1 hover:bg-gray-100 rounded" onClick={() => router.push("/mycourses")}>
              📚 Mes cours
            </button>
            <button className="text-left px-2 py-1 hover:bg-gray-100 rounded" onClick={() => router.push("/profile")}>
              👤 Mon profil
            </button>
          </nav>
          <LogoutButton />
        </>
      )}

      <div className="mt-auto text-xs text-gray-400">
        {/* Ajoute liens ou infos bas de sidebar */}
        © 2025 TutosHub
      </div>
    </aside>
  );
}

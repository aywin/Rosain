"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import LogoutButton from "@/components/auth/LogoutButton";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  const navItems = (
    <>
      {!user ? (
        <>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
            onClick={() => router.push("/login")}
          >
            Connexion
          </button>
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm"
            onClick={() => router.push("/signup")}
          >
            Inscription
          </button>
        </>
      ) : (
        <>
          <button
            className="hover:bg-gray-100 px-3 py-2 rounded text-sm"
            onClick={() => router.push("/mycourses")}
          >
            📚 Mes cours
          </button>
          <button
            className="hover:bg-gray-100 px-3 py-2 rounded text-sm"
            onClick={() => router.push("/profile")}
          >
            👤 Mon profil
          </button>
          <LogoutButton />
        </>
      )}
    </>
  );

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="font-bold text-xl text-blue-700 cursor-pointer"
            onClick={() => router.push("/")}
          >
            📘 TutosHub
          </span>
          <button
            className="hidden sm:inline text-blue-700 hover:underline text-sm"
            onClick={() => router.push("/courses")}
          >
            Tous les cours
          </button>
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-3">
          {navItems}
        </nav>

        {/* Hamburger button */}
        <button
          className="sm:hidden text-2xl"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          ☰
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="sm:hidden mt-3 flex flex-col gap-2">
          <button
            className="text-blue-700 hover:underline text-sm text-left"
            onClick={() => {
              router.push("/courses");
              setMenuOpen(false);
            }}
          >
            Tous les cours
          </button>
          {navItems}
        </div>
      )}
    </header>
  );
}

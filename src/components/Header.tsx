"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, Menu, X, Home, BookOpen, FileText, Video, HelpCircle } from "lucide-react";
import { Settings, ClipboardList, Edit, Info } from "lucide-react";
import { FileEdit, Sliders } from "lucide-react";
import { auth, db } from "@/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUser({
            nom: data.nom,
            prenom: data.prenom,
            email: data.email,
          });
          setRole(data.role?.trim() || null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  const toggleMobileMenu = () => setMobileOpen((prev) => !prev);
  const closeMobileMenu = () => setMobileOpen(false);
  const toggleUserMenu = () => setUserMenuOpen((prev) => !prev);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserMenuOpen(false);
    router.push("/login");
  };

  return (
    <header className="bg-gradient-to-r from-[#0D1B2A] to-[#1B9AAA] text-white shadow-md relative z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Image src="/logo.jpg" alt="Logo Rosaine Academy" width={40} height={40} className="rounded-full" />
          <span className="text-2xl font-bold hover:opacity-90">Rosaine Academy</span>
        </Link>

        {/* Navigation desktop */}
        <nav className="hidden md:flex space-x-6 font-medium items-center">
          <Link href="/" className="flex items-center gap-1 hover:text-[#4CAF50]"><Home size={16} /> Accueil</Link>

          {user && (
            <>
              <Link href="/courses" className="flex items-center gap-1 hover:text-[#4CAF50]"><BookOpen size={16} /> Cours</Link>
              <Link href="/mycourses" className="flex items-center gap-1 hover:text-[#4CAF50]"><ClipboardList size={16} /> Mes Cours</Link>
              <Link href="/exercices" className="flex items-center gap-1 hover:text-[#4CAF50]"><FileEdit size={16} /> Exercices</Link>
            </>
          )}

          <Link href="/about" className="flex items-center gap-1 hover:text-[#4CAF50]"><Info size={16} /> À propos</Link>

          {role === "superadmin" && (
            <Link
              href="/admin"
              className="flex items-center gap-1 bg-[#1B9AAA] text-white px-3 py-1 rounded hover:bg-[#0D1B2A] transition"
            >
              <Settings size={16} /> Administration
            </Link>
          )}
        </nav>

        {/* Menu utilisateur desktop */}
        <div className="hidden md:flex items-center space-x-4 relative">
          {user ? (
            <>
              <button
                onClick={toggleUserMenu}
                className="flex items-center space-x-2 bg-[#4CAF50] text-white px-3 py-1 rounded hover:opacity-90 transition"
              >
                <User size={18} />
                <span>{user.prenom} {user.nom}</span>
              </button>
              {userMenuOpen && (
                <div ref={userMenuRef} className="absolute right-0 top-12 bg-white text-gray-800 shadow-md rounded w-48 z-50">
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-[#E0F7FA]"
                    onClick={() => { router.push("/profile"); setUserMenuOpen(false); }}
                  >
                    Mon profil
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-[#E0F7FA]"
                    onClick={logout}
                  >
                    Se déconnecter
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link href="/login" className="bg-white text-[#1B9AAA] px-3 py-1 rounded hover:bg-[#E0F7FA] transition">
              Connexion
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-2 rounded text-white hover:bg-[#1B9AAA]/20"
          aria-label="Menu mobile"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0D1B2A]/90 px-4 py-4 space-y-4 text-white">
          <Link href="/" onClick={closeMobileMenu} className="block hover:text-[#4CAF50]">Accueil</Link>
          {user && (
            <>
              <Link href="/courses" onClick={closeMobileMenu} className="block hover:text-[#4CAF50]">Cours</Link>
              <Link href="/mycourses" onClick={closeMobileMenu} className="block hover:text-[#4CAF50]">Mes Cours</Link>
              <Link href="/exercices" onClick={closeMobileMenu} className="block hover:text-[#4CAF50]">Exercices</Link>
            </>
          )}
          <Link href="/about" onClick={closeMobileMenu} className="block hover:text-[#4CAF50]">À propos</Link>

          {role === "superadmin" && (
            <Link
              href="/admin"
              onClick={closeMobileMenu}
              className="block bg-[#1B9AAA] text-white px-3 py-2 rounded hover:bg-[#0D1B2A] transition"
            >
              Administration
            </Link>
          )}

          {user ? (
            <>
              <button
                onClick={() => { router.push("/profile"); closeMobileMenu(); }}
                className="w-full text-left hover:text-[#4CAF50]"
              >
                Mon profil
              </button>
              <button
                onClick={() => { logout(); closeMobileMenu(); }}
                className="w-full text-left hover:text-[#4CAF50]"
              >
                Se déconnecter
              </button>
            </>
          ) : (
            <Link href="/login" onClick={closeMobileMenu} className="block text-center bg-white text-[#1B9AAA] px-3 py-1 rounded hover:bg-[#E0F7FA]">
              Connexion
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Menu, X, Home, BookOpen, FileEdit, ClipboardList, Info, Settings } from "lucide-react";
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

  const colors = {
    darkBlue: "#25364C",
    white: "#FFFFFF",
    primaryBlue: "#1F77B0",
    primaryGreen: "#65B04E",
    lightGray: "#F9FAFB",
    hoverBlue: "#155E8B",
    lightHover: "#E5F0FA",
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);
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
    <header className="shadow-md relative z-50 bg-white text-[#25364C]">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Image src="/logo.jpg" alt="Logo Rosaine Academy" width={40} height={40} className="rounded-full" />
          <span className="text-2xl font-bold text-[#25364C] hover:opacity-80">Rosaine Academy</span>
        </Link>

        {/* Navigation desktop */}
        <nav className="hidden md:flex space-x-6 font-medium items-center">
          <Link href="/" className="flex items-center gap-1 text-[#25364C] hover:text-[#1F77B0]">
            <Home size={16} /> Accueil
          </Link>

          {user && (
            <>
              <Link href="/courses" className="flex items-center gap-1 text-[#25364C] hover:text-[#1F77B0]">
                <BookOpen size={16} /> Cours
              </Link>
              <Link href="/mycourses" className="flex items-center gap-1 text-[#25364C] hover:text-[#1F77B0]">
                <ClipboardList size={16} /> Mes Cours
              </Link>
              <Link href="/exercices" className="flex items-center gap-1 text-[#25364C] hover:text-[#1F77B0]">
                <FileEdit size={16} /> Exercices
              </Link>
            </>
          )}

          <Link href="/about" className="flex items-center gap-1 text-[#25364C] hover:text-[#1F77B0]">
            <Info size={16} /> À propos
          </Link>

          {role === "superadmin" && (
            <Link
              href="/admin"
              className="flex items-center gap-1 px-3 py-1 rounded bg-[#25364C] text-white hover:bg-[#334155] transition"
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
                className="flex items-center space-x-2 px-3 py-1 rounded bg-[#F9FAFB] text-[#25364C] hover:bg-[#65B04E] hover:text-white transition"
              >
                <User size={18} />
                <span>{user.prenom} {user.nom}</span>
              </button>
              {userMenuOpen && (
                <div ref={userMenuRef} className="absolute right-0 top-12 bg-white text-gray-800 shadow-md rounded w-48 z-50">
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-[#E5F0FA] hover:text-[#65B04E]"
                    onClick={() => {
                      router.push("/profile");
                      setUserMenuOpen(false);
                    }}
                  >
                    Mon profil
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-[#E5F0FA] hover:text-[#65B04E]"
                    onClick={logout}
                  >
                    Se déconnecter
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1 rounded bg-[#1F77B0] text-white hover:bg-[#155E8B] transition"
            >
              Connexion
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-2 rounded text-[#1F77B0] hover:bg-[#E5F0FA]"
          aria-label="Menu mobile"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden px-4 py-4 space-y-4 bg-[#F9FAFB] text-[#25364C]">
          <Link href="/" onClick={closeMobileMenu} className="block hover:text-[#1F77B0]">
            Accueil
          </Link>
          {user && (
            <>
              <Link href="/courses" onClick={closeMobileMenu} className="block hover:text-[#1F77B0]">
                Cours
              </Link>
              <Link href="/mycourses" onClick={closeMobileMenu} className="block hover:text-[#1F77B0]">
                Mes Cours
              </Link>
              <Link href="/exercices" onClick={closeMobileMenu} className="block hover:text-[#1F77B0]">
                Exercices
              </Link>
            </>
          )}
          <Link href="/about" onClick={closeMobileMenu} className="block hover:text-[#1F77B0]">
            À propos
          </Link>

          {role === "superadmin" && (
            <Link
              href="/admin"
              onClick={closeMobileMenu}
              className="block px-3 py-2 rounded bg-[#25364C] text-white hover:bg-[#334155] transition"
            >
              Administration
            </Link>
          )}

          {user ? (
            <>
              <button
                onClick={() => { router.push("/profile"); closeMobileMenu(); }}
                className="w-full text-left hover:text-[#65B04E]"
              >
                Mon profil
              </button>
              <button
                onClick={() => { logout(); closeMobileMenu(); }}
                className="w-full text-left hover:text-[#65B04E]"
              >
                Se déconnecter
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={closeMobileMenu}
              className="block px-3 py-1 rounded bg-[#1F77B0] text-white hover:bg-[#155E8B] transition text-center"
            >
              Connexion
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, Menu, X, Home, BookOpen, FileText, Video, HelpCircle } from "lucide-react";
import { Settings, ClipboardList, Edit , Info} from "lucide-react";
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
    <header className="bg-pink-100 text-gray-800 shadow-md relative z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Image src="/logo.jpg" alt="Logo Rosaine Academy" width={40} height={40} className="rounded-full" />
          <span className="text-2xl font-bold text-pink-600 hover:text-pink-500">Rosaine Academy</span>
        </Link>

        {/* Navigation desktop */}
<nav className="hidden md:flex space-x-6 font-medium items-center">
  <Link href="/" className="flex items-center gap-1 hover:text-pink-500"><Home size={16} /> Accueil</Link>

  {user && (
    <>
      <Link href="/courses" className="flex items-center gap-1 hover:text-pink-500"><BookOpen size={16} /> Cours</Link>
      <Link href="/mycourses" className="flex items-center gap-1 hover:text-pink-500"><ClipboardList size={16} /> Mes Cours</Link>
      <Link href="/exercices" className="flex items-center gap-1 hover:text-pink-500"><FileEdit size={16} /> Exercices</Link>
    </>
  )}

  <Link href="/about" className="flex items-center gap-1 hover:text-pink-500"><Info size={16} /> À propos</Link>

  {role === "superadmin" && (
    <Link
      href="/admin"
      className="flex items-center gap-1 bg-[#1E293B] text-white px-3 py-1 rounded hover:bg-[#334155] transition"
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
                className="flex items-center space-x-2 bg-pink-200 text-pink-800 px-3 py-1 rounded hover:bg-pink-300"
              >
                <User size={18} />
                <span>{user.prenom} {user.nom}</span>
              </button>
              {userMenuOpen && (
                <div ref={userMenuRef} className="absolute right-0 top-12 bg-white text-gray-800 shadow-md rounded w-48 z-50">
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-pink-50"
                    onClick={() => {
                      router.push("/profile");
                      setUserMenuOpen(false);
                    }}
                  >
                    Mon profil
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-pink-50"
                    onClick={logout}
                  >
                    Se déconnecter
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link href="/login" className="bg-white text-pink-700 border border-pink-300 px-3 py-1 rounded hover:bg-pink-50">
              Connexion
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-2 rounded text-pink-600 hover:bg-pink-200"
          aria-label="Menu mobile"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-pink-50 px-4 py-4 space-y-4 text-gray-800">
          <Link href="/" onClick={closeMobileMenu} className="block hover:text-pink-500">Accueil</Link>
          {user && (
            <>
              <Link href="/courses" onClick={closeMobileMenu} className="block hover:text-pink-500">Cours</Link>
              <Link href="/mycourses" onClick={closeMobileMenu} className="block hover:text-pink-500">Mes Cours</Link>
              <Link href="/exo" onClick={closeMobileMenu} className="block hover:text-pink-500">Exercices</Link>
            </>
          )}
          <Link href="/about" onClick={closeMobileMenu} className="block hover:text-pink-500">À propos</Link>

          {role === "superadmin" && (
            <Link
              href="/admin"
              onClick={closeMobileMenu}
              className="block bg-[#1E293B] text-white px-3 py-2 rounded hover:bg-[#334155] transition"
            >
              Administration
            </Link>
          )}

          {user ? (
            <>
              <button
                onClick={() => { router.push("/profile"); closeMobileMenu(); }}
                className="w-full text-left hover:text-pink-500"
              >
                Mon profil
              </button>
              <button
                onClick={() => { logout(); closeMobileMenu(); }}
                className="w-full text-left hover:text-pink-500"
              >
                Se déconnecter
              </button>
            </>
          ) : (
            <Link href="/login" onClick={closeMobileMenu} className="block text-center bg-white text-pink-700 px-3 py-1 rounded hover:bg-pink-100">
              Connexion
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

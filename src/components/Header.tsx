"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Menu,
  X,
  Home,
  BookOpen,
  FileEdit,
  ClipboardList,
  Info,
  Settings,
  LogOut,
  UserCircle,
  ChevronDown,
  TrendingUp,
  Library
} from "lucide-react";
import { auth, db } from "@/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileDropdown, setMobileDropdown] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const colors = {
    green: "#2C5F4D",
    navy: "#00205B",
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
  const closeMobileMenu = () => {
    setMobileOpen(false);
    setMobileDropdown(null);
  };
  const toggleUserMenu = () => setUserMenuOpen((prev) => !prev);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserMenuOpen(false);
    router.push("/login");
  };

  const menuItems = [
    {
      id: "explorer",
      label: "Explorer",
      icon: <Library size={18} />,
      items: [
        { label: "Tous les cours", href: "/courses", icon: <BookOpen size={16} /> },
        { label: "Exercices", href: "/exercices", icon: <FileEdit size={16} /> },
      ]
    },
    ...(user ? [{
      id: "mon-travail",
      label: "Mon travail",
      icon: <ClipboardList size={18} />,
      items: [
        { label: "Mes cours", href: "/mycourses", icon: <BookOpen size={16} /> },
        { label: "Ma progression", href: "/mark", icon: <TrendingUp size={16} /> },
      ]
    }] : []),
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <Image
              src="/logo.jpg"
              alt="Logo"
              width={40}
              height={40}
              className="rounded-full"
            />
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <Home size={18} />
              <span className="font-medium">Accueil</span>
            </Link>

            {menuItems.map((menu) => (
              <div
                key={menu.id}
                className="relative"
                onMouseEnter={() => setOpenDropdown(menu.id)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  {menu.icon}
                  <span className="font-medium">{menu.label}</span>
                  <ChevronDown size={16} className={`transition-transform ${openDropdown === menu.id ? 'rotate-180' : ''}`} />
                </button>

                {openDropdown === menu.id && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 w-56 py-2">
                    {menu.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Link
              href="/about"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <Info size={18} />
              <span className="font-medium">À propos</span>
            </Link>
          </nav>

          {/* Actions Desktop */}
          <div className="hidden lg:flex items-center gap-3">
            {role === "superadmin" && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors shadow-sm"
                style={{ backgroundColor: colors.navy }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                <Settings size={18} />
                <span className="font-medium">Admin</span>
              </Link>
            )}

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={toggleUserMenu}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-900 transition-colors"
                >
                  <User size={18} />
                  <span className="font-medium">{user.prenom}</span>
                  <ChevronDown size={16} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-14 bg-white rounded-lg shadow-lg border border-gray-200 w-56 py-2">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-semibold text-gray-900">{user.prenom} {user.nom}</p>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        router.push("/profile");
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <UserCircle size={18} />
                      <span>Mon profil</span>
                    </button>

                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={18} />
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-6 py-2 rounded-lg text-white font-medium transition-colors shadow-sm"
                style={{ backgroundColor: colors.green }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1e4d3c"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.green}
              >
                Connexion
              </Link>
            )}
          </div>

          {/* Bouton Menu Mobile */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Menu Mobile */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-1">
            {user && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-900">{user.prenom} {user.nom}</p>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
              </div>
            )}

            <Link
              href="/"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Home size={20} />
              <span className="font-medium">Accueil</span>
            </Link>

            {menuItems.map((menu) => (
              <div key={menu.id}>
                <button
                  onClick={() => setMobileDropdown(mobileDropdown === menu.id ? null : menu.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {menu.icon}
                    <span className="font-medium">{menu.label}</span>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`transition-transform ${mobileDropdown === menu.id ? 'rotate-180' : ''}`}
                  />
                </button>

                {mobileDropdown === menu.id && (
                  <div className="ml-4 mt-1 space-y-1">
                    {menu.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMobileMenu}
                        className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Link
              href="/about"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Info size={20} />
              <span className="font-medium">À propos</span>
            </Link>

            {role === "superadmin" && (
              <Link
                href="/admin"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-white transition-colors mt-2"
                style={{ backgroundColor: colors.navy }}
              >
                <Settings size={20} />
                <span className="font-medium">Administration</span>
              </Link>
            )}

            {user ? (
              <div className="pt-4 border-t border-gray-200 space-y-1 mt-4">
                <button
                  onClick={() => { router.push("/profile"); closeMobileMenu(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <UserCircle size={20} />
                  <span className="font-medium">Mon profil</span>
                </button>

                <button
                  onClick={() => { logout(); closeMobileMenu(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={20} />
                  <span className="font-medium">Se déconnecter</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-medium transition-colors mt-4"
                style={{ backgroundColor: colors.green }}
              >
                Connexion
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
// src/components/auth/LogoutButton.tsx
"use client";
import { auth } from "@/firebase";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  return (
    <button
      className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
      onClick={handleLogout}
      title="Se déconnecter"
    >
      ⏏ Déconnexion
    </button>
  );
}

"use client";

import ProtectSuperAdminRoute from "@/components/auth/ProtectSuperAdminRoute";
import { useRouter } from "next/navigation";
import { BookOpen, Clipboard, Video, CheckSquare, Tag, BarChart2 } from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();

  const adminPages = [
    { name: "Cours", path: "/admin/courses", icon: <BookOpen size={20} /> },
    { name: "Exercices", path: "/admin/exo", icon: <Clipboard size={20} /> },
    { name: "Vidéos", path: "/admin/videos", icon: <Video size={20} /> },
    { name: "Quiz", path: "/admin/quiz", icon: <CheckSquare size={20} /> },
    { name: "Matières", path: "/admin/subjects", icon: <Tag size={20} /> },
    { name: "Niveaux", path: "/admin/levels", icon: <BarChart2 size={20} /> },
  ];

  return (
    <ProtectSuperAdminRoute>
      <div className="max-w-6xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold mb-8 text-center">Dashboard Administration</h1>
        <div className="grid gap-6 md:grid-cols-3">
          {adminPages.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="flex items-center gap-3 bg-[#0F172A] text-white px-6 py-4 rounded-xl shadow hover:bg-[#334155] transition"
            >
              {item.icon}
              <span className="font-semibold">{item.name}</span>
            </button>
          ))}
        </div>
      </div>
    </ProtectSuperAdminRoute>
  );
}

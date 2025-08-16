"use client";

import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";

interface CourseHeaderProps {
  titre: string;
  niveau: string;
  
  
  onToggleSidebar?: () => void;
}

export default function CourseHeader({
  titre,
  niveau,
  onToggleSidebar,
}: CourseHeaderProps) {
  const router = useRouter();

  return (
    <div className="p-4 flex items-center justify-between bg-white border-b">
      {/* Hamburger visible uniquement sur petit écran */}
      <button
        onClick={onToggleSidebar}
        className="lg:hidden mr-3 text-gray-700"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-1">{titre}</h1>
        <div className="text-gray-700 text-sm mb-1">
          <b>{niveau}</b>
        </div>
      </div>

      <button
        className="bg-blue-600 text-white px-3 py-1 rounded hidden sm:block"
        onClick={() => router.push("/mycourses")}
      >
        Mes cours
      </button>
    </div>
  );
}

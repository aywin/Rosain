"use client";

import { useRouter } from "next/navigation";

interface CourseHeaderProps {
  titre: string;
  niveau: string;
  matiere: string;
  description?: string;
}

export default function CourseHeader({
  titre,
  niveau,
  matiere,
  description,
}: CourseHeaderProps) {
  const router = useRouter();

  return (
    <div className="p-4 flex items-center justify-between bg-white border-b">
      <div>
        <h1 className="text-2xl font-bold mb-1">{titre}</h1>
        <div className="text-gray-700 text-sm mb-1">
          Niveau : <b>{niveau}</b> | Matière : <b>{matiere}</b>
        </div>
        {description && (
          <div className="text-gray-600 text-xs">{description}</div>
        )}
      </div>
      <button
        className="bg-blue-600 text-white px-3 py-1 rounded"
        onClick={() => router.push("/mycourses")}
      >
        Mes cours
      </button>
    </div>
  );
}

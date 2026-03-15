// src/components/tuto/Courseheader.tsx
import { FaBars, FaGraduationCap, FaBook } from "react-icons/fa";

interface CourseHeaderProps {
  titre: string;
  niveau: string;
  onToggleSidebar: () => void;
}

export default function CourseHeader({ titre, niveau, onToggleSidebar }: CourseHeaderProps) {
  return (
    <header className="bg-teal-700 text-white shadow-md flex-shrink-0">
      <div className="flex items-center gap-3 px-4 py-3.5">

        {/* Bouton menu mobile */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 hover:bg-teal-600 transition flex-shrink-0"
          style={{ borderRadius: 0 }}
          aria-label="Menu"
        >
          <FaBars className="w-5 h-5" />
        </button>

        {/* Icône livre */}
        <div
          className="hidden lg:flex w-9 h-9 bg-teal-600 items-center justify-center flex-shrink-0"
          style={{ borderRadius: 0 }}
        >
          <FaBook className="w-4 h-4 text-white" />
        </div>

        {/* Titre */}
        <div className="flex-1 min-w-0">
          <h1 className="text-base md:text-lg font-bold leading-tight line-clamp-1 text-white">
            {titre}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <FaGraduationCap className="w-3.5 h-3.5 text-teal-200 flex-shrink-0" />
            <span className="text-xs text-teal-100 font-medium">{niveau}</span>
          </div>
        </div>

      </div>
    </header>
  );
}
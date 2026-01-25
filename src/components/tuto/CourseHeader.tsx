// front/src/components/tuto/CourseHeader.tsx
import { FaBars, FaGraduationCap, FaBook } from "react-icons/fa";

interface CourseHeaderProps {
  titre: string;
  niveau: string;
  onToggleSidebar: () => void;
}

export default function CourseHeader({ titre, niveau, onToggleSidebar }: CourseHeaderProps) {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
      <div className="flex items-center justify-between px-4 py-4">
        {/* Bouton menu mobile */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 hover:bg-blue-500 rounded-lg transition"
          aria-label="Menu"
        >
          <FaBars className="w-6 h-6" />
        </button>

        {/* Titre et niveau */}
        <div className="flex-1 flex flex-col lg:flex-row lg:items-center lg:gap-4">
          <div className="flex items-center gap-2">
            <FaBook className="w-5 h-5" />
            <h1 className="text-lg md:text-xl lg:text-2xl font-bold line-clamp-1">
              {titre}
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1 lg:mt-0">
            <FaGraduationCap className="w-4 h-4 text-blue-200" />
            <span className="text-sm lg:text-base text-blue-100 font-medium">
              {niveau}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
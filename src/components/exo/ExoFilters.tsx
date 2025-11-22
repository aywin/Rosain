"use client";

import { useState } from "react";
import { FaLayerGroup, FaBook, FaGraduationCap, FaFilter, FaTimes } from "react-icons/fa";

interface Level { id: string; name: string; }
interface Subject { id: string; name: string; }
interface Course { id: string; title: string; subject_id: string; level_id: string; }

interface ExoFiltersProps {
  levels: Level[];
  subjects: Subject[];
  courses: Course[];
  levelId: string;
  subjectId: string;
  courseId: string;
  setLevelId: (id: string) => void;
  setSubjectId: (id: string) => void;
  setCourseId: (id: string) => void;
}

export default function ExoFilters({
  levels, subjects, courses,
  levelId, subjectId, courseId,
  setLevelId, setSubjectId, setCourseId
}: ExoFiltersProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filteredCourses = courses.filter(
    c => (!levelId || c.level_id === levelId) && (!subjectId || c.subject_id === subjectId)
  );

  // Compter les filtres actifs
  const activeFiltersCount = [levelId, subjectId, courseId].filter(Boolean).length;

  return (
    <>
      {/* Version Desktop */}
      <div className="hidden md:block bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Niveau */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FaGraduationCap className="text-gray-500" />
                Niveau
              </label>
              <select
                className="w-full border border-gray-300 bg-white px-3 py-2.5 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                value={levelId}
                onChange={e => { setLevelId(e.target.value); setSubjectId(""); setCourseId(""); }}
              >
                <option value="">Tous les niveaux</option>
                {levels.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Matière */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FaLayerGroup className="text-gray-500" />
                Matière
              </label>
              <select
                className="w-full border border-gray-300 bg-white px-3 py-2.5 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                value={subjectId}
                onChange={e => { setSubjectId(e.target.value); setCourseId(""); }}
              >
                <option value="">Toutes les matières</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Cours */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FaBook className="text-gray-500" />
                Cours
              </label>
              <select
                className="w-full border border-gray-300 bg-white px-3 py-2.5 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                value={courseId}
                onChange={e => setCourseId(e.target.value)}
              >
                <option value="">Tous les cours</option>
                {filteredCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Version Mobile - Bouton pour ouvrir les filtres */}
      <div className="md:hidden bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="px-4 py-3">
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="w-full flex items-center justify-between bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg shadow-sm transition"
          >
            <span className="flex items-center gap-2 font-medium">
              <FaFilter />
              Filtres
            </span>
            {activeFiltersCount > 0 && (
              <span className="bg-white text-blue-600 px-2 py-1 rounded-full text-xs font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Modal Mobile pour les filtres */}
      {mobileFiltersOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
            {/* Header du modal */}
            <div className="sticky top-0 bg-white border-b px-4 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FaFilter className="text-blue-600" />
                Filtres
              </h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <FaTimes className="text-gray-600" />
              </button>
            </div>

            {/* Contenu des filtres */}
            <div className="p-4 space-y-6">
              {/* Niveau */}
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 text-base font-semibold text-gray-800">
                  <FaGraduationCap className="text-blue-600" size={18} />
                  Niveau
                </label>
                <select
                  className="w-full border-2 border-gray-300 bg-white px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-base"
                  value={levelId}
                  onChange={e => {
                    setLevelId(e.target.value);
                    setSubjectId("");
                    setCourseId("");
                  }}
                >
                  <option value="">Tous les niveaux</option>
                  {levels.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* Matière */}
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 text-base font-semibold text-gray-800">
                  <FaLayerGroup className="text-blue-600" size={18} />
                  Matière
                </label>
                <select
                  className="w-full border-2 border-gray-300 bg-white px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-base"
                  value={subjectId}
                  onChange={e => {
                    setSubjectId(e.target.value);
                    setCourseId("");
                  }}
                >
                  <option value="">Toutes les matières</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Cours */}
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 text-base font-semibold text-gray-800">
                  <FaBook className="text-blue-600" size={18} />
                  Cours
                </label>
                <select
                  className="w-full border-2 border-gray-300 bg-white px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-base"
                  value={courseId}
                  onChange={e => setCourseId(e.target.value)}
                >
                  <option value="">Tous les cours</option>
                  {filteredCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Bouton de réinitialisation */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => {
                    setLevelId("");
                    setSubjectId("");
                    setCourseId("");
                  }}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-3 rounded-xl font-medium transition"
                >
                  Réinitialiser les filtres
                </button>
              )}

              {/* Bouton Appliquer */}
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold shadow-lg transition"
              >
                Appliquer les filtres
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
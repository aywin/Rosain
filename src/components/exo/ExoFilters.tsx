import { useState } from "react";
import { FaLayerGroup, FaBook, FaGraduationCap, FaFilter, FaTimes, FaPlus } from "react-icons/fa";

interface Level { id: string; name: string; }
interface Subject { id: string; name: string; }
interface Course { id: string; title: string; subject_id: string; level_id: string; }

interface ExoFiltersProps {
  levels: Level[];
  subjects: Subject[];
  courses: Course[];
  levelId: string;
  subjectId: string;
  courseIds: string[];
  setLevelId: (id: string) => void;
  setSubjectId: (id: string) => void;
  setCourseIds: (ids: string[]) => void;
  filterMode: "any" | "all";
  setFilterMode: (mode: "any" | "all") => void;
}

export default function ExoFilters({
  levels, subjects, courses,
  levelId, subjectId, courseIds,
  setLevelId, setSubjectId, setCourseIds,
  filterMode, setFilterMode
}: ExoFiltersProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [showCourseSelector, setShowCourseSelector] = useState(false);

  const safeCoursIds = courseIds || [];

  const filteredCourses = (courses || []).filter(
    c => (!levelId || c.level_id === levelId) && (!subjectId || c.subject_id === subjectId)
  );

  const availableCourses = filteredCourses.filter(c => !safeCoursIds.includes(c.id));
  const selectedCourses = (courses || []).filter(c => safeCoursIds.includes(c.id));

  const addCourse = (courseId: string) => {
    if (courseId && !safeCoursIds.includes(courseId)) {
      setCourseIds([...safeCoursIds, courseId]);
      setShowCourseSelector(false);
    }
  };

  const removeCourse = (courseId: string) => {
    setCourseIds(safeCoursIds.filter(id => id !== courseId));
  };

  const activeFiltersCount = [levelId, subjectId, ...(safeCoursIds.length > 0 ? [true] : [])].filter(Boolean).length;

  return (
    <>
      {/* Version Desktop */}
      <div className="hidden md:block bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Ligne 1 : Niveau et Matière */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FaGraduationCap className="text-blue-600" />
                Niveau
              </label>
              <select
                className="w-full border border-gray-300 bg-white px-3 py-2.5 rounded-lg shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                value={levelId}
                onChange={e => {
                  setLevelId(e.target.value);
                  setSubjectId("");
                  setCourseIds([]);
                }}
              >
                <option value="">Tous les niveaux</option>
                {levels.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FaLayerGroup className="text-blue-600" />
                Matière
              </label>
              <select
                className="w-full border border-gray-300 bg-white px-3 py-2.5 rounded-lg shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                value={subjectId}
                onChange={e => {
                  setSubjectId(e.target.value);
                  setCourseIds([]);
                }}
              >
                <option value="">Toutes les matières</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ligne 2 : Cours sélectionnés */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <FaBook className="text-blue-600" />
              Cours
              {courseIds.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                  {courseIds.length}
                </span>
              )}
            </label>

            <div className="flex flex-wrap items-center gap-2">
              {/* Cours sélectionnés */}
              {selectedCourses.map(course => (
                <div
                  key={course.id}
                  className="flex items-center gap-2 bg-blue-50 border border-blue-300 text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
                >
                  <span className="text-sm font-medium">{course.title}</span>
                  <button
                    onClick={() => removeCourse(course.id)}
                    className="hover:bg-blue-200 rounded-full p-1 transition"
                    title="Retirer ce cours"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))}

              {/* Bouton sélectionner/ajouter un cours */}
              {availableCourses.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowCourseSelector(!showCourseSelector)}
                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition"
                  >
                    <FaPlus size={12} />
                    <span className="text-sm">
                      {safeCoursIds.length === 0 ? "Sélectionner un cours" : "Ajouter un cours"}
                    </span>
                  </button>

                  {/* Dropdown de sélection */}
                  {showCourseSelector && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowCourseSelector(false)}
                      />
                      <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-20 w-80 max-h-64 overflow-y-auto">
                        {availableCourses.map(course => (
                          <button
                            key={course.id}
                            onClick={() => addCourse(course.id)}
                            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition text-sm border-b border-gray-100 last:border-b-0"
                          >
                            {course.title}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Message si tous sélectionnés */}
              {availableCourses.length === 0 && safeCoursIds.length > 0 && (
                <span className="text-sm text-gray-500 italic">
                  Tous les cours sont sélectionnés
                </span>
              )}
            </div>
          </div>

          {/* Ligne 3 : Mode de filtrage (si plusieurs cours) */}
          {safeCoursIds.length > 1 && (
            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-600 font-medium">
                Parmi les cours sélectionnés, afficher les exercices qui concernent :
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterMode("any")}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition ${filterMode === "any"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  un des cours
                </button>
                <button
                  onClick={() => setFilterMode("all")}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition ${filterMode === "all"
                    ? "bg-purple-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  tous les cours
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Version Mobile - Bouton pour ouvrir les filtres */}
      <div className="md:hidden bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="px-4 py-3">
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="w-full flex items-center justify-between bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg shadow-sm transition"
          >
            <span className="flex items-center gap-2 font-medium">
              <FaFilter />
              Filtres
            </span>
            {activeFiltersCount > 0 && (
              <span className="bg-white text-blue-600 px-2.5 py-1 rounded-full text-xs font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Modal Mobile */}
      {mobileFiltersOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-4 py-4 flex items-center justify-between z-10">
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

            {/* Contenu */}
            <div className="p-4 space-y-6">
              {/* Niveau */}
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 text-base font-semibold text-gray-800">
                  <FaGraduationCap className="text-blue-600" size={18} />
                  Niveau
                </label>
                <select
                  className="w-full border-2 border-gray-300 bg-white px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  value={levelId}
                  onChange={e => {
                    setLevelId(e.target.value);
                    setSubjectId("");
                    setCourseIds([]);
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
                  className="w-full border-2 border-gray-300 bg-white px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  value={subjectId}
                  onChange={e => {
                    setSubjectId(e.target.value);
                    setCourseIds([]);
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
                  {safeCoursIds.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                      {safeCoursIds.length}
                    </span>
                  )}
                </label>

                {/* Cours sélectionnés */}
                {selectedCourses.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedCourses.map(course => (
                      <div
                        key={course.id}
                        className="flex items-center gap-2 bg-blue-50 border border-blue-300 text-blue-800 px-3 py-2 rounded-lg"
                      >
                        <span className="text-sm font-medium">{course.title}</span>
                        <button
                          onClick={() => removeCourse(course.id)}
                          className="hover:bg-blue-200 rounded-full p-1 transition"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bouton pour sélectionner/ajouter un cours */}
                {availableCourses.length > 0 ? (
                  <button
                    onClick={() => setShowCourseSelector(!showCourseSelector)}
                    className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 text-gray-700 px-4 py-3 rounded-xl font-medium transition"
                  >
                    <FaPlus size={14} />
                    <span>{safeCoursIds.length === 0 ? "Sélectionner un cours" : "Ajouter un cours"}</span>
                  </button>
                ) : (
                  safeCoursIds.length > 0 && (
                    <p className="text-sm text-gray-500 italic text-center py-2">
                      Tous les cours disponibles sont sélectionnés
                    </p>
                  )
                )}

                {/* Dropdown de sélection (mobile) */}
                {showCourseSelector && availableCourses.length > 0 && (
                  <div className="border-2 border-gray-300 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {availableCourses.map((course, index) => (
                      <button
                        key={course.id}
                        onClick={() => addCourse(course.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-blue-50 active:bg-blue-100 transition ${index !== availableCourses.length - 1 ? 'border-b border-gray-200' : ''
                          }`}
                      >
                        <span className="text-sm font-medium">{course.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mode de filtrage */}
              {safeCoursIds.length > 1 && (
                <div className="flex flex-col gap-3 pt-3 border-t border-gray-200">
                  <label className="text-base font-semibold text-gray-800">
                    Parmi les cours sélectionnés, afficher les exercices qui concernent :
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setFilterMode("any")}
                      className={`px-4 py-3 rounded-xl font-medium transition ${filterMode === "any"
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                      un des cours
                    </button>
                    <button
                      onClick={() => setFilterMode("all")}
                      className={`px-4 py-3 rounded-xl font-medium transition ${filterMode === "all"
                        ? "bg-purple-600 text-white shadow-lg"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                      tous les cours
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">
                    {filterMode === "any"
                      ? "Exercices concernant au moins l'un des cours sélectionnés"
                      : "Uniquement les exercices qui combinent tous les cours"}
                  </p>
                </div>
              )}

              {/* Boutons d'action */}
              <div className="space-y-3 pt-3">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => {
                      setLevelId("");
                      setSubjectId("");
                      setCourseIds([]);
                    }}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-3 rounded-xl font-medium transition"
                  >
                    Réinitialiser les filtres
                  </button>
                )}

                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold shadow-lg transition"
                >
                  Appliquer les filtres
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
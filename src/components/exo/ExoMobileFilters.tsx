import { useState } from "react";
import { FaLayerGroup, FaBook, FaGraduationCap, FaFilter, FaTimes, FaPlus } from "react-icons/fa";

interface Level { id: string; name: string; }
interface Subject { id: string; name: string; }
interface Course { id: string; title: string; subject_id: string; level_id: string; }

interface ExoMobileFiltersProps {
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
    exerciseCount: number;
}

export default function ExoMobileFilters({
    levels, subjects, courses,
    levelId, subjectId, courseIds,
    setLevelId, setSubjectId, setCourseIds,
    filterMode, setFilterMode,
    exerciseCount
}: ExoMobileFiltersProps) {
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const safeCoursIds = courseIds || [];

    const filteredCourses = (courses || []).filter(
        c => (!levelId || c.level_id === levelId) && (!subjectId || c.subject_id === subjectId)
    );

    const toggleCourse = (courseId: string) => {
        if (safeCoursIds.includes(courseId)) {
            setCourseIds(safeCoursIds.filter(id => id !== courseId));
        } else {
            setCourseIds([...safeCoursIds, courseId]);
        }
    };

    const selectAllCourses = () => {
        setCourseIds(filteredCourses.map(c => c.id));
    };

    const deselectAllCourses = () => {
        setCourseIds([]);
    };

    const activeFiltersCount = [levelId, subjectId, ...(safeCoursIds.length > 0 ? [true] : [])].filter(Boolean).length;

    return (
        <>
            {/* Bouton pour ouvrir les filtres */}
            <div className="bg-white border-b shadow-sm sticky top-0 z-30 md:hidden">
                <div className="px-4 py-3">
                    <button
                        onClick={() => setMobileFiltersOpen(true)}
                        className="w-full flex items-center justify-between bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg shadow-sm transition"
                    >
                        <span className="flex items-center gap-2 font-medium">
                            <FaFilter />
                            Filtres
                            {exerciseCount > 0 && (
                                <span className="text-xs opacity-90">
                                    ({exerciseCount} exercice{exerciseCount > 1 ? 's' : ''})
                                </span>
                            )}
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
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:hidden">
                    <div className="bg-white w-full rounded-t-2xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b px-4 py-4 flex items-center justify-between z-10">
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <FaFilter className="text-blue-600" />
                                    Filtres
                                </h3>
                                <p className="text-xs text-gray-600 mt-1">
                                    {exerciseCount} exercice{exerciseCount > 1 ? 's' : ''} trouvé{exerciseCount > 1 ? 's' : ''}
                                </p>
                            </div>
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

                                {/* Boutons rapides */}
                                {filteredCourses.length > 0 && (
                                    <div className="flex gap-3 mb-2">
                                        <button
                                            onClick={selectAllCourses}
                                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium transition"
                                        >
                                            Tout sélectionner
                                        </button>
                                        {safeCoursIds.length > 0 && (
                                            <button
                                                onClick={deselectAllCourses}
                                                className="text-sm text-gray-600 hover:text-gray-800 hover:underline font-medium transition"
                                            >
                                                Tout désélectionner
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Liste checkboxes */}
                                {filteredCourses.length > 0 ? (
                                    <div className="border-2 border-gray-300 rounded-xl overflow-hidden max-h-64 overflow-y-auto bg-gray-50">
                                        {filteredCourses.map((course, index) => (
                                            <label
                                                key={course.id}
                                                className={`flex items-start gap-3 px-4 py-3 hover:bg-white active:bg-blue-50 transition cursor-pointer ${index !== filteredCourses.length - 1 ? 'border-b border-gray-200' : ''
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={safeCoursIds.includes(course.id)}
                                                    onChange={() => toggleCourse(course.id)}
                                                    className="mt-0.5 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                                />
                                                <span className="text-sm font-medium flex-1">{course.title}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic text-center py-4">
                                        Sélectionnez un niveau et une matière
                                    </p>
                                )}
                            </div>

                            {/* Mode de filtrage */}
                            {safeCoursIds.length > 1 && (
                                <div className="flex flex-col gap-3 pt-3 border-t border-gray-200">
                                    <label className="text-base font-semibold text-gray-800">
                                        Parmi les cours sélectionnés, afficher les exercices qui concernent :
                                    </label>
                                    <div className="grid grid-cols-1 gap-3">
                                        <label className="flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition hover:border-blue-400"
                                            style={{
                                                borderColor: filterMode === "any" ? "#3b82f6" : "#d1d5db",
                                                backgroundColor: filterMode === "any" ? "#eff6ff" : "white"
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                checked={filterMode === "any"}
                                                onChange={() => setFilterMode("any")}
                                                className="mt-0.5 w-5 h-5 text-blue-600 cursor-pointer"
                                            />
                                            <div>
                                                <span className="text-sm font-medium">Au moins un des cours</span>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    Exercices concernant 1 ou plusieurs cours sélectionnés
                                                </p>
                                            </div>
                                        </label>
                                        <label className="flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition hover:border-purple-400"
                                            style={{
                                                borderColor: filterMode === "all" ? "#9333ea" : "#d1d5db",
                                                backgroundColor: filterMode === "all" ? "#faf5ff" : "white"
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                checked={filterMode === "all"}
                                                onChange={() => setFilterMode("all")}
                                                className="mt-0.5 w-5 h-5 text-purple-600 cursor-pointer"
                                            />
                                            <div>
                                                <span className="text-sm font-medium">Tous les cours (multi-thématiques)</span>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    Uniquement les exercices combinant tous les cours
                                                </p>
                                            </div>
                                        </label>
                                    </div>
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
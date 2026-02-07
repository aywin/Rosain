import { useState } from "react";
import { FaLayerGroup, FaBook, FaGraduationCap, FaFilter, FaTimes } from "react-icons/fa";

interface Level { id: string; name: string; }
interface Subject { id: string; name: string; }
interface Course { id: string; title: string; subject_id: string; level_id: string; }

interface ExoSidebarProps {
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

export default function ExoSidebar({
    levels, subjects, courses,
    levelId, subjectId, courseIds,
    setLevelId, setSubjectId, setCourseIds,
    filterMode, setFilterMode,
    exerciseCount
}: ExoSidebarProps) {
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

    const hasActiveFilters = levelId || subjectId || safeCoursIds.length > 0;

    return (
        <aside className="w-72 bg-white border-r h-screen sticky top-0 overflow-y-auto">
            <div className="p-6">
                {/* Header */}
                <div className="mb-6 pb-4 border-b">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                        <FaFilter className="text-blue-600" />
                        Filtres
                    </h2>
                    <p className="text-sm text-gray-600 mt-2">
                        <span className="font-semibold text-blue-600">{exerciseCount}</span> exercice{exerciseCount > 1 ? 's' : ''} trouvé{exerciseCount > 1 ? 's' : ''}
                    </p>
                </div>

                {/* Niveau */}
                <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                        <FaGraduationCap className="inline mr-2 text-blue-600" />
                        Niveau
                    </label>
                    <select
                        className="w-full border border-gray-300 bg-white px-3 py-2 rounded-lg shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
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
                <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                        <FaLayerGroup className="inline mr-2 text-blue-600" />
                        Matière
                    </label>
                    <select
                        className="w-full border border-gray-300 bg-white px-3 py-2 rounded-lg shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
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

                {/* Cours avec checkboxes */}
                <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                        <FaBook className="inline mr-2 text-blue-600" />
                        Cours
                        {safeCoursIds.length > 0 && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                                {safeCoursIds.length}
                            </span>
                        )}
                    </label>

                    {/* Boutons rapides */}
                    {filteredCourses.length > 0 && (
                        <div className="flex gap-3 mb-3">
                            <button
                                onClick={selectAllCourses}
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium transition"
                            >
                                Tout sélectionner
                            </button>
                            {safeCoursIds.length > 0 && (
                                <button
                                    onClick={deselectAllCourses}
                                    className="text-xs text-gray-600 hover:text-gray-800 hover:underline font-medium transition"
                                >
                                    Tout désélectionner
                                </button>
                            )}
                        </div>
                    )}

                    {/* Liste checkboxes */}
                    {filteredCourses.length > 0 ? (
                        <div className="space-y-1 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                            {filteredCourses.map(course => (
                                <label
                                    key={course.id}
                                    className="flex items-start gap-2 p-2 hover:bg-white rounded cursor-pointer transition group"
                                >
                                    <input
                                        type="checkbox"
                                        checked={safeCoursIds.includes(course.id)}
                                        onChange={() => toggleCourse(course.id)}
                                        className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="text-sm flex-1 leading-tight group-hover:text-blue-700 transition">
                                        {course.title}
                                    </span>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic">
                            Sélectionnez un niveau et une matière
                        </p>
                    )}
                </div>

                {/* Mode filtrage (si multi-sélection) */}
                {safeCoursIds.length > 1 && (
                    <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                        <label className="block text-sm font-semibold mb-3 text-gray-800">
                            Afficher les exercices concernant :
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-start gap-2 cursor-pointer group">
                                <input
                                    type="radio"
                                    checked={filterMode === "any"}
                                    onChange={() => setFilterMode("any")}
                                    className="mt-0.5 w-4 h-4 text-blue-600 cursor-pointer"
                                />
                                <div className="flex-1">
                                    <span className="text-sm font-medium group-hover:text-blue-700 transition">
                                        Au moins un des cours
                                    </span>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        Exercices concernant 1 ou plusieurs cours sélectionnés
                                    </p>
                                </div>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer group">
                                <input
                                    type="radio"
                                    checked={filterMode === "all"}
                                    onChange={() => setFilterMode("all")}
                                    className="mt-0.5 w-4 h-4 text-purple-600 cursor-pointer"
                                />
                                <div className="flex-1">
                                    <span className="text-sm font-medium group-hover:text-purple-700 transition">
                                        Tous les cours (multi-thématiques)
                                    </span>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        Uniquement les exercices combinant tous les cours
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                {/* Reset */}
                {hasActiveFilters && (
                    <button
                        onClick={() => {
                            setLevelId("");
                            setSubjectId("");
                            setCourseIds([]);
                        }}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 shadow-sm"
                    >
                        <FaTimes size={12} />
                        Réinitialiser les filtres
                    </button>
                )}
            </div>
        </aside>
    );
}
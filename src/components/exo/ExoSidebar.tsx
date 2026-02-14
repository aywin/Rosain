import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaLayerGroup, FaBook, FaGraduationCap, FaFilter, FaTimes, FaChevronDown, FaChevronRight } from "react-icons/fa";
import { FileText, ExternalLink } from "lucide-react";

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
    exerciseCount,
}: ExoSidebarProps) {
    const router = useRouter();
    const safeIds = courseIds || [];

    // Accordéons — Niveau et Matière fermés par défaut (valeur visible dans le titre)
    // Cours ouvert par défaut
    const [openLevel, setOpenLevel] = useState(false);
    const [openSubject, setOpenSubject] = useState(false);
    const [openCourses, setOpenCourses] = useState(true);

    const filteredCourses = (courses || []).filter(
        c => (!levelId || c.level_id === levelId) && (!subjectId || c.subject_id === subjectId)
    );

    const toggleCourse = (id: string) =>
        safeIds.includes(id)
            ? setCourseIds(safeIds.filter(x => x !== id))
            : setCourseIds([...safeIds, id]);

    const currentLevel = levels.find(l => l.id === levelId);
    const currentSubject = subjects.find(s => s.id === subjectId);
    const hasActive = levelId || subjectId || safeIds.length > 0;

    // ── Composant accordéon réutilisable ──────────────────────────────────────
    const AccordionHeader = ({
        icon, label, open, onToggle, badge,
    }: {
        icon: React.ReactNode;
        label: string;
        open: boolean;
        onToggle: () => void;
        badge?: React.ReactNode;
    }) => (
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-1 py-1.5 group hover:bg-gray-50 rounded-lg transition"
        >
            <div className="flex items-center gap-2">
                {open
                    ? <FaChevronDown size={9} className="text-gray-400 transition-transform" />
                    : <FaChevronRight size={9} className="text-gray-400 transition-transform" />
                }
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    {icon}
                    {label}
                </span>
            </div>
            {badge}
        </button>
    );

    return (
        <aside className="w-64 bg-white border-r h-screen sticky top-0 flex flex-col">

            {/* ── Header page ── */}
            <div className="px-4 py-4 border-b flex-shrink-0">
                <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    📚 Exercices
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                    <span className="font-semibold text-blue-600">{exerciseCount}</span> exercice{exerciseCount > 1 ? "s" : ""} trouvé{exerciseCount > 1 ? "s" : ""}
                </p>
            </div>


            {/* ── Bouton PDF — juste sous le header ── */}
            <div className="px-3 pt-2 pb-1 flex-shrink-0">
                <button
                    onClick={() => router.push("/pdf")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-100 hover:border-blue-200 transition group"
                >
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:bg-blue-700 transition">
                        <FileText size={14} className="text-white" />
                    </div>
                    <div className="text-left min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800">Ouvrir un PDF</p>
                        <p className="text-[11px] text-gray-500 leading-tight">
                            Résous un exercice PDF avec l'IA
                        </p>
                    </div>
                    <ExternalLink size={12} className="text-blue-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition" />
                </button>
            </div>

            <div className="border-t border-gray-100 mx-3 mb-1 flex-shrink-0" />

            {/* ── Zone scrollable ── */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">

                {/* Label section filtres */}
                <div className="flex items-center justify-between px-1 py-1 mb-1">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FaFilter size={9} />
                        Filtres
                    </span>
                    {hasActive && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                            {(levelId ? 1 : 0) + (subjectId ? 1 : 0) + (safeIds.length > 0 ? 1 : 0)} actif{((levelId ? 1 : 0) + (subjectId ? 1 : 0) + (safeIds.length > 0 ? 1 : 0)) > 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                {/* ── NIVEAU ── */}
                <AccordionHeader
                    icon={<FaGraduationCap size={10} className="text-blue-500" />}
                    label="Niveau"
                    open={openLevel}
                    onToggle={() => setOpenLevel(v => !v)}
                    badge={
                        !openLevel && currentLevel ? (
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                {currentLevel.name}
                            </span>
                        ) : !openLevel ? (
                            <span className="text-xs text-gray-400">Tous</span>
                        ) : null
                    }
                />
                {openLevel && (
                    <div className="pl-4 pb-2 space-y-0.5">
                        <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                                type="radio" name="level" value=""
                                checked={levelId === ""}
                                onChange={() => { setLevelId(""); setSubjectId(""); setCourseIds([]); }}
                                className="accent-blue-600 w-3.5 h-3.5 flex-shrink-0"
                            />
                            <span className="text-sm text-gray-600">Tous les niveaux</span>
                        </label>
                        {levels.map(l => (
                            <label key={l.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                                <input
                                    type="radio" name="level" value={l.id}
                                    checked={levelId === l.id}
                                    onChange={() => { setLevelId(l.id); setSubjectId(""); setCourseIds([]); }}
                                    className="accent-blue-600 w-3.5 h-3.5 flex-shrink-0"
                                />
                                <span className="text-sm text-gray-700 font-medium">{l.name}</span>
                            </label>
                        ))}
                    </div>
                )}

                <div className="border-t border-gray-100 my-1" />

                {/* ── MATIÈRE ── */}
                <AccordionHeader
                    icon={<FaLayerGroup size={10} className="text-blue-500" />}
                    label="Matière"
                    open={openSubject}
                    onToggle={() => setOpenSubject(v => !v)}
                    badge={
                        !openSubject && currentSubject ? (
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                {currentSubject.name}
                            </span>
                        ) : !openSubject ? (
                            <span className="text-xs text-gray-400">Toutes</span>
                        ) : null
                    }
                />
                {openSubject && (
                    <div className="pl-4 pb-2 space-y-0.5">
                        <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                                type="radio" name="subject" value=""
                                checked={subjectId === ""}
                                onChange={() => { setSubjectId(""); setCourseIds([]); }}
                                className="accent-blue-600 w-3.5 h-3.5 flex-shrink-0"
                            />
                            <span className="text-sm text-gray-600">Toutes les matières</span>
                        </label>
                        {subjects.map(s => (
                            <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                                <input
                                    type="radio" name="subject" value={s.id}
                                    checked={subjectId === s.id}
                                    onChange={() => { setSubjectId(s.id); setCourseIds([]); }}
                                    className="accent-blue-600 w-3.5 h-3.5 flex-shrink-0"
                                />
                                <span className="text-sm text-gray-700 font-medium">{s.name}</span>
                            </label>
                        ))}
                    </div>
                )}

                <div className="border-t border-gray-100 my-1" />

                {/* ── COURS ── */}
                <AccordionHeader
                    icon={<FaBook size={10} className="text-blue-500" />}
                    label="Cours"
                    open={openCourses}
                    onToggle={() => setOpenCourses(v => !v)}
                    badge={
                        <div className="flex items-center gap-1.5">
                            {safeIds.length > 0 && (
                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                    {safeIds.length}/{filteredCourses.length}
                                </span>
                            )}
                            {/* La croix est toujours visible si sélections actives — même accordéon fermé */}
                            {safeIds.length > 0 && (
                                <button
                                    onClick={e => { e.stopPropagation(); setCourseIds([]); }}
                                    className="text-gray-300 hover:text-red-400 transition p-0.5"
                                    title="Tout désélectionner"
                                >
                                    <FaTimes size={10} />
                                </button>
                            )}
                        </div>
                    }
                />
                {openCourses && (
                    <div className="pl-2 pb-2">
                        {filteredCourses.length > 0 ? (
                            <>
                                {/* Tout sélectionner */}
                                {filteredCourses.length > 1 && (
                                    <div className="flex gap-3 px-2 py-1 mb-1">
                                        {safeIds.length < filteredCourses.length && (
                                            <button
                                                onClick={() => setCourseIds(filteredCourses.map(c => c.id))}
                                                className="text-xs text-blue-500 hover:text-blue-700 font-medium transition"
                                            >
                                                Tout sélectionner
                                            </button>
                                        )}
                                        {safeIds.length > 0 && (
                                            <button
                                                onClick={() => setCourseIds([])}
                                                className="text-xs text-gray-400 hover:text-gray-600 font-medium transition"
                                            >
                                                Tout désélectionner
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Checkboxes */}
                                <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1">
                                    {filteredCourses.map(c => {
                                        const checked = safeIds.includes(c.id);
                                        return (
                                            <label
                                                key={c.id}
                                                className={`flex items-start gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition ${checked ? "bg-blue-50" : "hover:bg-gray-50"
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleCourse(c.id)}
                                                    className="mt-0.5 w-3.5 h-3.5 accent-blue-600 flex-shrink-0 cursor-pointer"
                                                />
                                                <span className={`text-xs leading-snug ${checked ? "text-blue-700 font-medium" : "text-gray-700"}`}>
                                                    {c.title}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-gray-400 italic px-2 py-1">
                                Sélectionnez un niveau et une matière
                            </p>
                        )}
                    </div>
                )}

                {/* ── Mode filtrage multi-cours (visible accordéon ouvert ou fermé) ── */}
                {safeIds.length > 1 && (
                    <div className="mt-2 p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                        <p className="text-[11px] font-semibold text-gray-500 mb-2">Exercices concernant :</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterMode("any")}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${filterMode === "any"
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-white text-gray-500 border border-gray-200 hover:border-blue-300"
                                    }`}
                            >
                                un cours
                            </button>
                            <button
                                onClick={() => setFilterMode("all")}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${filterMode === "all"
                                    ? "bg-purple-600 text-white shadow-sm"
                                    : "bg-white text-gray-500 border border-gray-200 hover:border-purple-300"
                                    }`}
                            >
                                tous
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Reset global ── */}
                {hasActive && (
                    <button
                        onClick={() => { setLevelId(""); setSubjectId(""); setCourseIds([]); }}
                        className="w-full text-xs text-gray-400 hover:text-red-500 py-1.5 mt-2 transition flex items-center justify-center gap-1.5 border border-dashed border-gray-200 rounded-lg hover:border-red-200"
                    >
                        <FaTimes size={10} />
                        Réinitialiser tous les filtres
                    </button>
                )}
            </div>

        </aside>
    );
}
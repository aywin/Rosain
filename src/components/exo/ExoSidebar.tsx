import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaTimes, FaChevronDown, FaChevronRight } from "react-icons/fa";
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

    const AccordionHeader = ({
        label, open, onToggle, badge,
    }: {
        label: string;
        open: boolean;
        onToggle: () => void;
        badge?: React.ReactNode;
    }) => (
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-teal-50 transition group"
        >
            <div className="flex items-center gap-1.5">
                {open
                    ? <FaChevronDown size={8} className="text-teal-400" />
                    : <FaChevronRight size={8} className="text-teal-400" />
                }
                <span className="text-xs font-semibold text-gray-600 group-hover:text-teal-700 transition">{label}</span>
            </div>
            {badge}
        </button>
    );

    return (
        <aside className="w-64 bg-white border-r h-screen sticky top-0 flex flex-col">

            {/* ══ SECTION OUTILS ══ */}
            <div className="flex-shrink-0 bg-gray-50 border-b-2 border-gray-200">
                {/* Label section */}
                <div className="px-4 pt-3 pb-1.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Outils</p>
                </div>

                {/* PDF Reader — rectangle avec bordure teal */}
                <div className="px-3 pb-3">
                    <button
                        onClick={() => router.push("/pdf")}
                        className="w-full flex items-center gap-3 px-3 py-2.5 bg-white border-2 border-teal-600 hover:bg-teal-600 text-teal-700 hover:text-white transition-all duration-150 group shadow-sm"
                        style={{ borderRadius: 0 }}
                    >
                        <div className="w-7 h-7 flex items-center justify-center bg-teal-600 group-hover:bg-white transition-all duration-150 flex-shrink-0">
                            <FileText size={14} className="text-white group-hover:text-teal-700 transition-colors duration-150" />
                        </div>
                        <span className="text-sm font-bold flex-1 text-left tracking-wide">PDF Reader</span>
                        <ExternalLink size={13} className="opacity-50 group-hover:opacity-100 transition flex-shrink-0" />
                    </button>
                </div>
            </div>

            {/* ══ SECTION FILTRES ══ */}
            <div className="flex items-center justify-between px-4 py-2 bg-white border-b flex-shrink-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filtres</p>
                {exerciseCount > 0 && (
                    <span className="text-[11px] font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                        {exerciseCount} exo{exerciseCount > 1 ? "s" : ""}
                    </span>
                )}
            </div>

            {/* ── Filtres ── */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">

                {/* ── NIVEAU ── */}
                <AccordionHeader
                    label="Niveau"
                    open={openLevel}
                    onToggle={() => setOpenLevel(v => !v)}
                    badge={
                        !openLevel && currentLevel
                            ? <span className="text-[11px] text-teal-600 font-medium bg-teal-50 px-2 py-0.5 rounded-full">{currentLevel.name}</span>
                            : !openLevel
                                ? <span className="text-[11px] text-gray-400">Tous</span>
                                : null
                    }
                />
                {openLevel && (
                    <div className="pl-4 pb-1 space-y-0.5">
                        <label className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-teal-50 cursor-pointer">
                            <input type="radio" name="level" value=""
                                checked={levelId === ""}
                                onChange={() => { setLevelId(""); setSubjectId(""); setCourseIds([]); }}
                                className="accent-teal-600 w-3 h-3 flex-shrink-0"
                            />
                            <span className="text-xs text-gray-500">Tous</span>
                        </label>
                        {levels.map(l => (
                            <label key={l.id} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-teal-50 cursor-pointer">
                                <input type="radio" name="level" value={l.id}
                                    checked={levelId === l.id}
                                    onChange={() => { setLevelId(l.id); setSubjectId(""); setCourseIds([]); }}
                                    className="accent-teal-600 w-3 h-3 flex-shrink-0"
                                />
                                <span className="text-xs text-gray-700">{l.name}</span>
                            </label>
                        ))}
                    </div>
                )}

                <div className="border-t border-gray-100 my-0.5" />

                {/* ── MATIÈRE ── */}
                <AccordionHeader
                    label="Matière"
                    open={openSubject}
                    onToggle={() => setOpenSubject(v => !v)}
                    badge={
                        !openSubject && currentSubject
                            ? <span className="text-[11px] text-teal-600 font-medium bg-teal-50 px-2 py-0.5 rounded-full">{currentSubject.name}</span>
                            : !openSubject
                                ? <span className="text-[11px] text-gray-400">Toutes</span>
                                : null
                    }
                />
                {openSubject && (
                    <div className="pl-4 pb-1 space-y-0.5">
                        <label className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-teal-50 cursor-pointer">
                            <input type="radio" name="subject" value=""
                                checked={subjectId === ""}
                                onChange={() => { setSubjectId(""); setCourseIds([]); }}
                                className="accent-teal-600 w-3 h-3 flex-shrink-0"
                            />
                            <span className="text-xs text-gray-500">Toutes</span>
                        </label>
                        {subjects.map(s => (
                            <label key={s.id} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-teal-50 cursor-pointer">
                                <input type="radio" name="subject" value={s.id}
                                    checked={subjectId === s.id}
                                    onChange={() => { setSubjectId(s.id); setCourseIds([]); }}
                                    className="accent-teal-600 w-3 h-3 flex-shrink-0"
                                />
                                <span className="text-xs text-gray-700">{s.name}</span>
                            </label>
                        ))}
                    </div>
                )}

                <div className="border-t border-gray-100 my-0.5" />

                {/* ── COURS ── */}
                <AccordionHeader
                    label="Cours"
                    open={openCourses}
                    onToggle={() => setOpenCourses(v => !v)}
                    badge={
                        <div className="flex items-center gap-1.5">
                            {safeIds.length > 0 && (
                                <span className="text-[11px] text-teal-600 font-medium bg-teal-50 px-2 py-0.5 rounded-full">
                                    {safeIds.length}/{filteredCourses.length}
                                </span>
                            )}
                            {safeIds.length > 0 && (
                                <button
                                    onClick={e => { e.stopPropagation(); setCourseIds([]); }}
                                    className="text-gray-300 hover:text-red-400 transition p-0.5"
                                    title="Tout désélectionner"
                                >
                                    <FaTimes size={9} />
                                </button>
                            )}
                        </div>
                    }
                />
                {openCourses && (
                    <div className="pl-2 pb-1">
                        {filteredCourses.length > 0 ? (
                            <>
                                {filteredCourses.length > 1 && (
                                    <div className="flex gap-3 px-2 py-0.5 mb-0.5">
                                        {safeIds.length < filteredCourses.length && (
                                            <button
                                                onClick={() => setCourseIds(filteredCourses.map(c => c.id))}
                                                className="text-[11px] text-teal-600 hover:text-teal-800 transition font-medium"
                                            >
                                                Tout sélectionner
                                            </button>
                                        )}
                                        {safeIds.length > 0 && (
                                            <button
                                                onClick={() => setCourseIds([])}
                                                className="text-[11px] text-gray-400 hover:text-gray-600 transition"
                                            >
                                                Désélectionner
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1">
                                    {filteredCourses.map(c => {
                                        const checked = safeIds.includes(c.id);
                                        return (
                                            <label
                                                key={c.id}
                                                className={`flex items-start gap-2 px-2 py-1 rounded-md cursor-pointer transition ${checked ? "bg-teal-50" : "hover:bg-gray-50"}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleCourse(c.id)}
                                                    className="mt-0.5 w-3 h-3 accent-teal-600 flex-shrink-0 cursor-pointer"
                                                />
                                                <span className={`text-xs leading-snug ${checked ? "text-teal-700 font-medium" : "text-gray-600"}`}>
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

                {/* ── Mode filtrage multi-cours ── */}
                {safeIds.length > 1 && (
                    <div className="mt-1 px-1 flex items-center gap-2">
                        <span className="text-[11px] text-gray-400 flex-shrink-0">Inclure :</span>
                        <button
                            onClick={() => setFilterMode("any")}
                            className={`text-[11px] px-2 py-0.5 rounded-full transition ${filterMode === "any" ? "bg-teal-600 text-white font-medium" : "text-gray-400 hover:text-gray-600 bg-gray-100"}`}
                        >
                            un cours
                        </button>
                        <button
                            onClick={() => setFilterMode("all")}
                            className={`text-[11px] px-2 py-0.5 rounded-full transition ${filterMode === "all" ? "bg-teal-600 text-white font-medium" : "text-gray-400 hover:text-gray-600 bg-gray-100"}`}
                        >
                            tous
                        </button>
                    </div>
                )}

                {/* ── Reset ── */}
                {hasActive && (
                    <button
                        onClick={() => { setLevelId(""); setSubjectId(""); setCourseIds([]); }}
                        className="w-full text-[11px] text-gray-400 hover:text-red-500 py-1.5 mt-1 transition flex items-center justify-center gap-1 border border-dashed border-gray-200 rounded-lg hover:border-red-200"
                    >
                        <FaTimes size={9} />
                        Réinitialiser les filtres
                    </button>
                )}
            </div>
        </aside>
    );
}
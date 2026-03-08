"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaTimes, FaChevronDown, FaChevronRight } from "react-icons/fa";
import { FileText, ExternalLink, SlidersHorizontal } from "lucide-react";

interface Level { id: string; name: string; }
interface Subject { id: string; name: string; }
interface Course { id: string; title: string; subject_id: string; level_id: string; }

interface ExoMobileDrawerProps {
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

export default function ExoMobileDrawer({
    levels, subjects, courses,
    levelId, subjectId, courseIds,
    setLevelId, setSubjectId, setCourseIds,
    filterMode, setFilterMode,
    exerciseCount,
}: ExoMobileDrawerProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const safeIds = courseIds || [];

    const [openLevel, setOpenLevel] = useState(true);
    const [openSubject, setOpenSubject] = useState(true);
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
    const activeCount = [levelId, subjectId, ...(safeIds.length > 0 ? [true] : [])].filter(Boolean).length;

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    const AccordionHeader = ({
        label, open: isOpen, onToggle, badge,
    }: {
        label: string;
        open: boolean;
        onToggle: () => void;
        badge?: React.ReactNode;
    }) => (
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-1 py-2 hover:bg-teal-50 rounded-md transition group"
        >
            <div className="flex items-center gap-2">
                {isOpen
                    ? <FaChevronDown size={9} className="text-teal-400" />
                    : <FaChevronRight size={9} className="text-teal-400" />
                }
                <span className="text-sm font-semibold text-gray-700 group-hover:text-teal-700 transition">{label}</span>
            </div>
            {badge}
        </button>
    );

    return (
        <>
            {/* ── Barre sticky mobile ── */}
            <div className="md:hidden bg-white border-b sticky top-0 z-30 px-4 py-2.5 flex items-center justify-between shadow-sm">
                <button
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-2 text-gray-700 hover:text-teal-700 transition"
                >
                    <SlidersHorizontal size={18} className="text-teal-600" />
                    <span className="text-sm font-medium">Filtres</span>
                    {activeCount > 0 && (
                        <span className="bg-teal-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                            {activeCount}
                        </span>
                    )}
                </button>

                <div className="flex items-center gap-2.5">
                    {exerciseCount > 0 && (
                        <span className="text-xs text-gray-500">
                            <span className="font-semibold text-teal-600">{exerciseCount}</span> exo{exerciseCount > 1 ? "s" : ""}
                        </span>
                    )}
                    {/* PDF Reader compact barre mobile — rectangle + bordure teal */}
                    <button
                        onClick={() => router.push("/pdf")}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border-2 border-teal-600 text-teal-700 hover:bg-teal-600 hover:text-white transition-all duration-150 text-xs font-bold"
                        style={{ borderRadius: 0 }}
                    >
                        <FileText size={13} />
                        PDF
                    </button>
                </div>
            </div>

            {/* ── Overlay ── */}
            {open && (
                <div
                    className="md:hidden fixed inset-0 bg-black/40 z-40"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* ── Drawer ── */}
            <div
                className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* Header drawer */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b flex-shrink-0 bg-white">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal size={16} className="text-teal-600" />
                        <span className="font-semibold text-gray-800 text-sm">Filtres & Outils</span>
                        {exerciseCount > 0 && (
                            <span className="text-xs text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                                {exerciseCount} exo{exerciseCount > 1 ? "s" : ""}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-600"
                    >
                        <FaTimes size={14} />
                    </button>
                </div>

                {/* ══ SECTION OUTILS ══ */}
                <div className="flex-shrink-0 bg-gray-50 border-b-2 border-gray-200">
                    <div className="px-4 pt-3 pb-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Outils</p>
                    </div>
                    <div className="px-4 pb-3">
                        <button
                            onClick={() => { setOpen(false); router.push("/pdf"); }}
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
                    {hasActive && (
                        <button
                            onClick={() => { setLevelId(""); setSubjectId(""); setCourseIds([]); }}
                            className="text-[11px] text-gray-400 hover:text-red-500 transition flex items-center gap-1"
                        >
                            <FaTimes size={9} />
                            Réinitialiser
                        </button>
                    )}
                </div>

                {/* Contenu scrollable */}
                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1">

                    {/* ── NIVEAU ── */}
                    <AccordionHeader
                        label="Niveau"
                        open={openLevel}
                        onToggle={() => setOpenLevel(v => !v)}
                        badge={
                            currentLevel
                                ? <span className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-0.5 rounded-full">{currentLevel.name}</span>
                                : <span className="text-xs text-gray-400">Tous</span>
                        }
                    />
                    {openLevel && (
                        <div className="pl-5 pb-2 space-y-1">
                            <label className="flex items-center gap-3 py-1.5 cursor-pointer">
                                <input type="radio" name="mob-level" value=""
                                    checked={levelId === ""}
                                    onChange={() => { setLevelId(""); setSubjectId(""); setCourseIds([]); }}
                                    className="accent-teal-600 w-4 h-4 flex-shrink-0"
                                />
                                <span className="text-sm text-gray-500">Tous</span>
                            </label>
                            {levels.map(l => (
                                <label key={l.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
                                    <input type="radio" name="mob-level" value={l.id}
                                        checked={levelId === l.id}
                                        onChange={() => { setLevelId(l.id); setSubjectId(""); setCourseIds([]); }}
                                        className="accent-teal-600 w-4 h-4 flex-shrink-0"
                                    />
                                    <span className="text-sm text-gray-700">{l.name}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    <div className="border-t border-gray-100" />

                    {/* ── MATIÈRE ── */}
                    <AccordionHeader
                        label="Matière"
                        open={openSubject}
                        onToggle={() => setOpenSubject(v => !v)}
                        badge={
                            currentSubject
                                ? <span className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-0.5 rounded-full">{currentSubject.name}</span>
                                : <span className="text-xs text-gray-400">Toutes</span>
                        }
                    />
                    {openSubject && (
                        <div className="pl-5 pb-2 space-y-1">
                            <label className="flex items-center gap-3 py-1.5 cursor-pointer">
                                <input type="radio" name="mob-subject" value=""
                                    checked={subjectId === ""}
                                    onChange={() => { setSubjectId(""); setCourseIds([]); }}
                                    className="accent-teal-600 w-4 h-4 flex-shrink-0"
                                />
                                <span className="text-sm text-gray-500">Toutes</span>
                            </label>
                            {subjects.map(s => (
                                <label key={s.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
                                    <input type="radio" name="mob-subject" value={s.id}
                                        checked={subjectId === s.id}
                                        onChange={() => { setSubjectId(s.id); setCourseIds([]); }}
                                        className="accent-teal-600 w-4 h-4 flex-shrink-0"
                                    />
                                    <span className="text-sm text-gray-700">{s.name}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    <div className="border-t border-gray-100" />

                    {/* ── COURS ── */}
                    <AccordionHeader
                        label="Cours"
                        open={openCourses}
                        onToggle={() => setOpenCourses(v => !v)}
                        badge={
                            safeIds.length > 0
                                ? <span className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-0.5 rounded-full">{safeIds.length}/{filteredCourses.length}</span>
                                : null
                        }
                    />
                    {openCourses && (
                        <div className="pl-2 pb-2">
                            {filteredCourses.length > 0 ? (
                                <>
                                    {filteredCourses.length > 1 && (
                                        <div className="flex gap-3 px-2 py-1 mb-1">
                                            {safeIds.length < filteredCourses.length && (
                                                <button
                                                    onClick={() => setCourseIds(filteredCourses.map(c => c.id))}
                                                    className="text-xs text-teal-600 hover:text-teal-800 transition font-medium"
                                                >
                                                    Tout sélectionner
                                                </button>
                                            )}
                                            {safeIds.length > 0 && (
                                                <button
                                                    onClick={() => setCourseIds([])}
                                                    className="text-xs text-gray-400 hover:text-gray-600 transition"
                                                >
                                                    Tout désélectionner
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <div className="space-y-0.5 max-h-64 overflow-y-auto">
                                        {filteredCourses.map(c => {
                                            const checked = safeIds.includes(c.id);
                                            return (
                                                <label
                                                    key={c.id}
                                                    className={`flex items-start gap-3 px-2 py-2 rounded-lg cursor-pointer transition ${checked ? "bg-teal-50" : "hover:bg-gray-50"}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleCourse(c.id)}
                                                        className="mt-0.5 w-4 h-4 accent-teal-600 flex-shrink-0 cursor-pointer"
                                                    />
                                                    <span className={`text-sm leading-snug ${checked ? "text-teal-700 font-medium" : "text-gray-600"}`}>
                                                        {c.title}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-gray-400 italic px-2 py-2">
                                    Sélectionnez un niveau et une matière
                                </p>
                            )}
                        </div>
                    )}

                    {/* ── Mode filtrage multi-cours ── */}
                    {safeIds.length > 1 && (
                        <div className="mt-2 px-1 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-2">Afficher les exercices qui concernent :</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFilterMode("any")}
                                    className={`flex-1 py-2 text-xs font-medium transition ${filterMode === "any" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                                    style={{ borderRadius: 0 }}
                                >
                                    un cours
                                </button>
                                <button
                                    onClick={() => setFilterMode("all")}
                                    className={`flex-1 py-2 text-xs font-medium transition ${filterMode === "all" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                                    style={{ borderRadius: 0 }}
                                >
                                    tous les cours
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Reset ── */}
                    {hasActive && (
                        <button
                            onClick={() => { setLevelId(""); setSubjectId(""); setCourseIds([]); }}
                            className="w-full text-xs text-gray-400 hover:text-red-500 py-2 mt-2 transition flex items-center justify-center gap-1 border border-dashed border-gray-200 hover:border-red-200"
                            style={{ borderRadius: 0 }}
                        >
                            <FaTimes size={9} />
                            Réinitialiser les filtres
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
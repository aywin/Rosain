"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import ExoSidebar from "./ExoSidebar";
import ExoMobileDrawer from "./ExoMobileDrawer";
import ExoCard from "./ExoCard";
import ExoAssistantPanel from "./ExoAssistantPanel";
import { FaSpinner, FaRobot, FaTimes } from "react-icons/fa";
import { useRouter } from "next/navigation";

interface Level { id: string; name: string; }
interface Subject { id: string; name: string; }
interface Course { id: string; title: string; subject_id: string; level_id: string; order?: number; }
interface Exo {
  id: string; title: string; description?: string; difficulty?: string;
  level_id?: string; subject_id?: string; course_ids?: string[]; course_id?: string;
  order?: number; statement_text?: string; solution_text?: string;
  statement_files?: string[]; solution_files?: string[]; tags?: string[];
}

export default function ExoList() {
  const router = useRouter();
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [exos, setExos] = useState<Exo[]>([]);
  const [loading, setLoading] = useState(true);

  const [levelId, setLevelId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<"any" | "all">("any");

  const [openStatementIds, setOpenStatementIds] = useState<Set<string>>(new Set());
  const [openSolutionIds, setOpenSolutionIds] = useState<Set<string>>(new Set());

  const [showAssistant, setShowAssistant] = useState(false);
  const [currentExoContext, setCurrentExoContext] = useState<any>(null);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set());

  const [assistantWidth, setAssistantWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);

  const toggleStatement = (id: string) =>
    setOpenStatementIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleSolution = (id: string) =>
    setOpenSolutionIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  useEffect(() => {
    const fetchData = async () => {
      const [levelsSnap, subjectsSnap, coursesSnap, exosSnap] = await Promise.all([
        getDocs(collection(db, "levels")),
        getDocs(collection(db, "subjects")),
        getDocs(collection(db, "courses")),
        getDocs(collection(db, "exercises")),
      ]);

      const levelsData = levelsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Level));
      const subjectsData = subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
      const sortedCourses = coursesSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Course))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const exosData = exosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Exo));

      setLevels(levelsData);
      setSubjects(subjectsData);
      setCourses(sortedCourses);
      setExos(exosData);

      const terminalLevel = levelsData.find(l => l.name === "Terminal");
      const mathsSubject = subjectsData.find(s => s.name === "Maths");

      if (terminalLevel && mathsSubject) {
        const firstCourse = sortedCourses.find(
          c => c.level_id === terminalLevel.id && c.subject_id === mathsSubject.id && c.order === 1
        );
        if (firstCourse) {
          setLevelId(terminalLevel.id);
          setSubjectId(mathsSubject.id);
          setCourseIds([firstCourse.id]);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const toggleExerciseSelection = (exoId: string) =>
    setSelectedExerciseIds(prev => {
      const s = new Set(prev);
      s.has(exoId) ? s.delete(exoId) : s.add(exoId);
      return s;
    });

  const handleAssistantClick = (exoContext: any) => {
    setCurrentExoContext(exoContext);
    setShowAssistant(true);
    setSelectedExerciseIds(prev => { const s = new Set(prev); s.add(exoContext.id); return s; });
  };

  const selectedExercises = exos
    .filter(exo => selectedExerciseIds.has(exo.id))
    .map(exo => {
      const level = levels.find(l => l.id === exo.level_id);
      const subject = subjects.find(s => s.id === exo.subject_id);
      const exoCourseIds = exo.course_ids || (exo.course_id ? [exo.course_id] : []);
      const exoCourses = courses.filter(c => exoCourseIds.includes(c.id)).map(c => c.title);
      return {
        id: exo.id, title: exo.title,
        statement: exo.statement_text, solution: exo.solution_text,
        difficulty: exo.difficulty, tags: exo.tags,
        level: level?.name, subject: subject?.name,
        order: exo.order, courses: exoCourses,
        isMultiCourse: exoCourseIds.length > 1,
        source: "platform" as const,
      };
    });

  const updateActiveExercises = (exercises: any[]) => {
    setSelectedExerciseIds(new Set(exercises.map(ex => ex.id)));
  };

  const filteredCourses = courses.filter(
    c => (!levelId || c.level_id === levelId) && (!subjectId || c.subject_id === subjectId)
  );

  const currentLevel = levels.find(l => l.id === levelId);
  const currentSubject = subjects.find(s => s.id === subjectId);

  const filteredExos = exos.filter(e => {
    const exoCourseIds = e.course_ids || (e.course_id ? [e.course_id] : []);
    if (courseIds.length === 0) return true;
    return filterMode === "any"
      ? courseIds.some(id => exoCourseIds.includes(id))
      : courseIds.every(id => exoCourseIds.includes(id));
  }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Resize assistant
  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) =>
      setAssistantWidth(Math.max(350, Math.min(800, window.innerWidth - e.clientX)));
    const onUp = () => setIsResizing(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [isResizing]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FaSpinner className="animate-spin text-blue-500 text-4xl mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Chargement des exercices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Sidebar desktop ── */}
      <div className="hidden md:flex flex-col h-full">
        <ExoSidebar
          levels={levels}
          subjects={subjects}
          courses={filteredCourses}
          levelId={levelId}
          subjectId={subjectId}
          courseIds={courseIds}
          setLevelId={setLevelId}
          setSubjectId={setSubjectId}
          setCourseIds={setCourseIds}
          filterMode={filterMode}
          setFilterMode={setFilterMode}
          exerciseCount={filteredExos.length}
        />
      </div>

      {/* ── Contenu principal scrollable ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Drawer mobile (remplace la barre mobile précédente) ── */}
        <ExoMobileDrawer
          levels={levels}
          subjects={subjects}
          courses={filteredCourses}
          levelId={levelId}
          subjectId={subjectId}
          courseIds={courseIds}
          setLevelId={setLevelId}
          setSubjectId={setSubjectId}
          setCourseIds={setCourseIds}
          filterMode={filterMode}
          setFilterMode={setFilterMode}
          exerciseCount={filteredExos.length}
        />

        {/* Liste exercices */}
        <div className="max-w-4xl mx-auto px-3 md:px-6 py-6 pb-24">
          {filteredExos.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-base">
                {courseIds.length > 1 && filterMode === "all"
                  ? "Aucun exercice ne combine tous ces cours"
                  : "Aucun exercice trouvé pour cette sélection"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {courseIds.length === 0 ? (
                filteredCourses.map(course => {
                  const courseExos = filteredExos.filter(e => {
                    const ids = e.course_ids || (e.course_id ? [e.course_id] : []);
                    return ids.includes(course.id);
                  });
                  if (courseExos.length === 0) return null;
                  return (
                    <div key={course.id} className="space-y-4">
                      <h3 className="text-lg font-bold text-gray-800 border-b-2 border-blue-500 pb-2 flex items-center justify-between">
                        <span>{course.title}</span>
                        <span className="text-sm font-normal text-gray-500">
                          {courseExos.length} exercice{courseExos.length > 1 ? "s" : ""}
                        </span>
                      </h3>
                      {courseExos.map(exo => (
                        <ExoCard
                          key={exo.id} exo={exo}
                          levels={levels} subjects={subjects} courses={courses}
                          openStatementIds={openStatementIds} openSolutionIds={openSolutionIds}
                          toggleStatement={toggleStatement} toggleSolution={toggleSolution}
                          onAssistantClick={handleAssistantClick}
                          isSelectedForAssistant={selectedExerciseIds.has(exo.id)}
                          onToggleSelection={toggleExerciseSelection}
                        />
                      ))}
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-800">
                      {filterMode === "all" && courseIds.length > 1
                        ? `Exercices combinant ${courseIds.length} cours`
                        : `${filteredExos.length} exercice${filteredExos.length > 1 ? "s" : ""} trouvé${filteredExos.length > 1 ? "s" : ""}`}
                    </h3>
                    {filterMode === "all" && courseIds.length > 1 && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
                        🔗 Multi-thématiques
                      </span>
                    )}
                  </div>
                  <div className="space-y-4">
                    {filteredExos.map(exo => (
                      <ExoCard
                        key={exo.id} exo={exo}
                        levels={levels} subjects={subjects} courses={courses}
                        openStatementIds={openStatementIds} openSolutionIds={openSolutionIds}
                        toggleStatement={toggleStatement} toggleSolution={toggleSolution}
                        onAssistantClick={handleAssistantClick}
                        isSelectedForAssistant={selectedExerciseIds.has(exo.id)}
                        onToggleSelection={toggleExerciseSelection}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bouton assistant flottant desktop ── */}
      {!showAssistant && (
        <button
          onClick={() => { setCurrentExoContext(null); setShowAssistant(true); }}
          className="hidden md:flex fixed bottom-8 right-8 bg-green-600 hover:bg-green-700 text-white rounded-full px-5 py-3.5 shadow-2xl transition-all hover:scale-105 z-40 items-center gap-2.5"
        >
          <FaRobot className="text-xl" />
          <span className="font-semibold text-sm">Assistant IA</span>
          {selectedExerciseIds.size > 0 && (
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow">
              {selectedExerciseIds.size}
            </span>
          )}
        </button>
      )}

      {/* ── Bouton assistant flottant mobile ── */}
      {!showAssistant && (
        <button
          onClick={() => { setCurrentExoContext(null); setShowAssistant(true); }}
          className="md:hidden fixed bottom-4 right-4 bg-green-600 text-white rounded-full w-14 h-14 shadow-2xl z-40 flex items-center justify-center"
        >
          <FaRobot className="text-xl" />
          {selectedExerciseIds.size > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {selectedExerciseIds.size}
            </span>
          )}
        </button>
      )}

      {/* ── Assistant desktop (panel latéral resizable) ── */}
      {showAssistant && (
        <div
          className="hidden md:block fixed right-0 top-0 h-full bg-white shadow-2xl z-50 border-l"
          style={{ width: `${assistantWidth}px` }}
        >
          <div
            className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-green-400 transition-colors group z-10"
            onMouseDown={() => setIsResizing(true)}
          >
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-gray-200 group-hover:bg-green-400 rounded-r transition" />
          </div>
          <ExoAssistantPanel
            onClose={() => { setShowAssistant(false); setCurrentExoContext(null); }}
            exoContext={currentExoContext}
            userLevel={currentLevel?.name}
            userSubject={currentSubject?.name}
            activeExercises={selectedExercises}
            onExercisesChange={updateActiveExercises}
          />
        </div>
      )}

      {/* ── Assistant mobile (plein écran) ── */}
      {showAssistant && (
        <div className="md:hidden fixed inset-0 bg-white z-50 flex flex-col">
          <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between shadow-md flex-shrink-0">
            <div className="flex items-center gap-3">
              <FaRobot className="text-xl" />
              <h2 className="font-semibold text-lg">Assistant IA</h2>
            </div>
            <button
              onClick={() => { setShowAssistant(false); setCurrentExoContext(null); }}
              className="p-2 hover:bg-green-700 rounded-full transition"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ExoAssistantPanel
              onClose={() => { setShowAssistant(false); setCurrentExoContext(null); }}
              exoContext={currentExoContext}
              userLevel={currentLevel?.name}
              userSubject={currentSubject?.name}
              activeExercises={selectedExercises}
              onExercisesChange={updateActiveExercises}
            />
          </div>
        </div>
      )}
    </div>
  );
}
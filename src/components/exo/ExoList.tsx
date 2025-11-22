"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import ExoFilters from "./ExoFilters";
import ExoCard from "./ExoCard";
import ExoAssistantPanel from "./ExoAssistantPanel";
import { FaSpinner, FaRobot, FaTimes } from "react-icons/fa";

interface Level {
  id: string;
  name: string;
}
interface Subject {
  id: string;
  name: string;
}
interface Course {
  id: string;
  title: string;
  subject_id: string;
  level_id: string;
  order?: number;
}
interface Exo {
  id: string;
  title: string;
  description?: string;
  difficulty?: string;
  level_id?: string;
  subject_id?: string;
  course_id?: string;
  order?: number;
  statement_text?: string;
  solution_text?: string;
  statement_files?: string[];
  solution_files?: string[];
  tags?: string[];
}

export default function ExoList() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [exos, setExos] = useState<Exo[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [levelId, setLevelId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [courseId, setCourseId] = useState("");

  // Ouvertures
  const [openStatementIds, setOpenStatementIds] = useState<Set<string>>(new Set());
  const [openSolutionIds, setOpenSolutionIds] = useState<Set<string>>(new Set());

  const toggleStatement = (exoId: string) => {
    setOpenStatementIds(prev => {
      const copy = new Set(prev);
      copy.has(exoId) ? copy.delete(exoId) : copy.add(exoId);
      return copy;
    });
  };

  const toggleSolution = (exoId: string) => {
    setOpenSolutionIds(prev => {
      const copy = new Set(prev);
      copy.has(exoId) ? copy.delete(exoId) : copy.add(exoId);
      return copy;
    });
  };

  // Gestion de la sélection pour l'assistant
  const [showAssistant, setShowAssistant] = useState(false);
  const [currentExoContext, setCurrentExoContext] = useState<any>(null);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      const [levelsSnap, subjectsSnap, coursesSnap, exosSnap] = await Promise.all([
        getDocs(collection(db, "levels")),
        getDocs(collection(db, "subjects")),
        getDocs(collection(db, "courses")),
        getDocs(collection(db, "exercises")),
      ]);

      const levelsData = levelsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Level));
      const subjectsData = subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Subject));
      const sortedCourses = coursesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Course))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const exosData = exosSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exo));

      setLevels(levelsData);
      setSubjects(subjectsData);
      setCourses(sortedCourses);
      setExos(exosData);

      // Initialiser les filtres par défaut : Terminal + Maths + cours order=1
      const terminalLevel = levelsData.find((l) => l.name === "Terminal");
      const mathsSubject = subjectsData.find((s) => s.name === "Maths");

      if (terminalLevel && mathsSubject) {
        const firstCourse = sortedCourses.find(
          (c) => c.level_id === terminalLevel.id && c.subject_id === mathsSubject.id && c.order === 1
        );

        if (firstCourse) {
          setLevelId(terminalLevel.id);
          setSubjectId(mathsSubject.id);
          setCourseId(firstCourse.id);
        }
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  const toggleExerciseSelection = (exoId: string) => {
    setSelectedExerciseIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exoId)) {
        newSet.delete(exoId);
      } else {
        newSet.add(exoId);
      }
      return newSet;
    });
  };

  const handleAssistantClick = (exoContext: any) => {
    setCurrentExoContext(exoContext);
    setShowAssistant(true);

    // Auto-sélectionner cet exercice s'il ne l'est pas déjà
    setSelectedExerciseIds(prev => {
      const newSet = new Set(prev);
      newSet.add(exoContext.id);
      return newSet;
    });
  };

  const selectedExercises = exos
    .filter(exo => selectedExerciseIds.has(exo.id))
    .map(exo => {
      const level = levels.find(l => l.id === exo.level_id);
      const subject = subjects.find(s => s.id === exo.subject_id);
      return {
        id: exo.id,
        title: exo.title,
        statement: exo.statement_text,
        solution: exo.solution_text,
        difficulty: exo.difficulty,
        tags: exo.tags,
        level: level?.name,
        subject: subject?.name,
        order: exo.order
      };
    });

  const openGeneralAssistant = () => {
    setCurrentExoContext(null);
    setShowAssistant(true);
  };

  const filteredCourses = courses.filter(
    (c) => (!levelId || c.level_id === levelId) && (!subjectId || c.subject_id === subjectId)
  );

  const currentLevel = levels.find(l => l.id === levelId);
  const currentSubject = subjects.find(s => s.id === subjectId);

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
    <div className="min-h-screen bg-gray-50">
      {/* Filtres en position sticky */}
      <ExoFilters
        levels={levels}
        subjects={subjects}
        courses={filteredCourses}
        levelId={levelId}
        subjectId={subjectId}
        courseId={courseId}
        setLevelId={setLevelId}
        setSubjectId={setSubjectId}
        setCourseId={setCourseId}
      />

      {/* Bouton flottant Assistant IA - Version Desktop */}
      {!showAssistant && (
        <button
          onClick={openGeneralAssistant}
          className="hidden md:flex fixed bottom-8 right-8 bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-110 z-40 items-center gap-3"
          title="Ouvrir l'assistant IA"
        >
          <FaRobot className="text-2xl" />
          <span className="font-semibold">Assistant IA</span>
          {selectedExerciseIds.size > 0 && (
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs w-7 h-7 rounded-full flex items-center justify-center font-bold shadow-lg">
              {selectedExerciseIds.size}
            </span>
          )}
        </button>
      )}

      {/* Bouton flottant Assistant IA - Version Mobile */}
      {!showAssistant && (
        <button
          onClick={openGeneralAssistant}
          className="md:hidden fixed bottom-4 right-4 bg-green-600 hover:bg-green-700 text-white rounded-full w-14 h-14 shadow-2xl transition-all duration-300 active:scale-95 z-40 flex items-center justify-center"
          title="Assistant IA"
        >
          <FaRobot className="text-xl" />
          {selectedExerciseIds.size > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-lg">
              {selectedExerciseIds.size}
            </span>
          )}
        </button>
      )}

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-8 pb-20 md:pb-8">
        {filteredCourses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-base md:text-lg">Aucun cours trouvé pour cette sélection.</p>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-8">
            {filteredCourses.map((course) => {
              const courseExos = exos
                .filter((e) => e.course_id === course.id && (!courseId || e.course_id === courseId))
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

              if (courseExos.length === 0) return null;

              return (
                <div key={course.id} className="space-y-4 md:space-y-6">
                  {courseExos.map((exo) => (
                    <ExoCard
                      key={exo.id}
                      exo={exo}
                      levels={levels}
                      subjects={subjects}
                      courses={courses}
                      openStatementIds={openStatementIds}
                      openSolutionIds={openSolutionIds}
                      toggleStatement={toggleStatement}
                      toggleSolution={toggleSolution}
                      onAssistantClick={handleAssistantClick}
                      isSelectedForAssistant={selectedExerciseIds.has(exo.id)}
                      onToggleSelection={toggleExerciseSelection}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Panel Assistant IA - Version Desktop */}
      {showAssistant && (
        <div className="hidden md:block fixed right-0 top-0 w-[450px] max-w-full h-full bg-white shadow-2xl z-50 border-l">
          <ExoAssistantPanel
            onClose={() => {
              setShowAssistant(false);
              setCurrentExoContext(null);
            }}
            exoContext={currentExoContext}
            userLevel={currentLevel?.name}
            userSubject={currentSubject?.name}
            activeExercises={selectedExercises}
          />
        </div>
      )}

      {/* Panel Assistant IA - Version Mobile (Full screen) */}
      {showAssistant && (
        <div className="md:hidden fixed inset-0 bg-white z-50 flex flex-col">
          {/* Header mobile avec bouton retour */}
          <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <FaRobot className="text-xl" />
              <h2 className="font-semibold text-lg">Assistant IA</h2>
            </div>
            <button
              onClick={() => {
                setShowAssistant(false);
                setCurrentExoContext(null);
              }}
              className="p-2 hover:bg-green-700 rounded-full transition"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>

          {/* Contenu du panel */}
          <div className="flex-1 overflow-hidden">
            <ExoAssistantPanel
              onClose={() => {
                setShowAssistant(false);
                setCurrentExoContext(null);
              }}
              exoContext={currentExoContext}
              userLevel={currentLevel?.name}
              userSubject={currentSubject?.name}
              activeExercises={selectedExercises}
            />
          </div>
        </div>
      )}
    </div>
  );
}
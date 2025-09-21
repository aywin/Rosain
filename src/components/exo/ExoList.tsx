"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import ExoFilters from "./ExoFilters";
import ExoCard from "./ExoCard";
import { FaSpinner } from "react-icons/fa";

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
  const [openStatementId, setOpenStatementId] = useState<string | null>(null);
  const [openSolutionId, setOpenSolutionId] = useState<string | null>(null);

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

      // ✅ Initialiser les filtres par défaut : Terminal + Maths + cours order=1
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

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-blue-500 text-3xl" />
        <span className="ml-2 text-gray-700">Chargement des exercices...</span>
      </div>
    );

  // 🔹 Filtrage dynamique des cours selon filtres
  const filteredCourses = courses.filter(
    (c) => (!levelId || c.level_id === levelId) && (!subjectId || c.subject_id === subjectId)
  );

  return (
    <div className="p-4 max-w-6xl mx-auto">
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

      {filteredCourses.length === 0 && (
        <p className="text-center text-gray-500 mt-6">Aucun exercice trouvé.</p>
      )}

      <div className="flex flex-col gap-10 mt-6">
        {filteredCourses.map((course) => {
          const courseExos = exos
            .filter((e) => e.course_id === course.id && (!courseId || e.course_id === courseId))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

          if (courseExos.length === 0) return null;

          return (
            <div key={course.id}>
              <div className="flex flex-col items-center gap-6">
                {courseExos.map((exo) => (
                  <div key={exo.id} className="w-full max-w-2xl">
                    <ExoCard
                      exo={exo}
                      levels={levels}
                      subjects={subjects}
                      courses={courses}
                      openStatementId={openStatementId}
                      openSolutionId={openSolutionId}
                      setOpenStatementId={setOpenStatementId}
                      setOpenSolutionId={setOpenSolutionId}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

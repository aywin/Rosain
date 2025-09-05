"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import ExoFilters from "./ExoFilters";
import ExoCard from "./ExoCard";

interface Level { id: string; name: string; }
interface Subject { id: string; name: string; }
interface Course { id: string; title: string; subject_id: string; level_id: string; }
interface Exo { id: string; title: string; description?: string; difficulty?: string; level_id?: string; subject_id?: string; course_id?: string; statement_text?: string; solution_text?: string; statement_files?: string[]; solution_files?: string[]; tags?: string[]; }

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

      setLevels(levelsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Level)));
      setSubjects(subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Subject)));
      setCourses(coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
      setExos(exosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Exo)));

      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <p>Chargement...</p>;

  // Filtrage dynamique
  const filteredCourses = courses.filter(
    c => (!levelId || c.level_id === levelId) && (!subjectId || c.subject_id === subjectId)
  );
  const filteredExos = exos.filter(
    e => filteredCourses.some(c => c.id === e.course_id) && (!courseId || e.course_id === courseId)
  );

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📚 Bibliothèque d’exercices</h1>

      <ExoFilters
        levels={levels}
        subjects={subjects}
        courses={courses}
        levelId={levelId}
        subjectId={subjectId}
        courseId={courseId}
        setLevelId={setLevelId}
        setSubjectId={setSubjectId}
        setCourseId={setCourseId}
      />

      {filteredExos.length === 0 && <p>Aucun exercice trouvé.</p>}
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-6">
        {filteredExos.map(exo => (
          <ExoCard
            key={exo.id}
            exo={exo}
            levels={levels}
            subjects={subjects}
            courses={courses}
            openStatementId={openStatementId}
            openSolutionId={openSolutionId}
            setOpenStatementId={setOpenStatementId}
            setOpenSolutionId={setOpenSolutionId}
          />
        ))}
      </div>
    </div>
  );
}

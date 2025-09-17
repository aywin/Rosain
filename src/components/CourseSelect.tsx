"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";

interface Level { id: string; name: string; }
interface Subject { id: string; name: string; }
interface Course { id: string; title: string; level_id: string; subject_id: string; }

interface CoursesSelectProps {
  value: string; // courseId sélectionné
  onChange: (courseId: string, levelId: string, subjectId: string) => void;
}

export default function CoursesSelect({ value, onChange }: CoursesSelectProps) {
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  // Charger niveaux et matières
  useEffect(() => {
    const fetchData = async () => {
      const levelsSnap = await getDocs(collection(db, "levels"));
      setLevels(levelsSnap.docs.map(d => ({ id: d.id, name: d.data().name })));

      const subjectsSnap = await getDocs(collection(db, "subjects"));
      setSubjects(subjectsSnap.docs.map(d => ({ id: d.id, name: d.data().name })));

      const coursesSnap = await getDocs(collection(db, "courses"));
      setCourses(coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
    };
    fetchData();
  }, []);

  // Filtrer les cours
  const filteredCourses = courses.filter(
    c =>
      (selectedLevel ? c.level_id === selectedLevel : true) &&
      (selectedSubject ? c.subject_id === selectedSubject : true)
  );

  return (
    <div className="space-y-2">
      <select
        value={selectedLevel}
        onChange={e => { setSelectedLevel(e.target.value); }}
        className="border p-2 rounded w-full"
      >
        <option value="">-- Sélectionner un niveau --</option>
        {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      <select
        value={selectedSubject}
        onChange={e => { setSelectedSubject(e.target.value); }}
        className="border p-2 rounded w-full"
      >
        <option value="">-- Sélectionner une matière --</option>
        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <select
        value={value}
        onChange={e => {
          const courseId = e.target.value;
          const course = courses.find(c => c.id === courseId);
          if (course) {
            onChange(courseId, course.level_id, course.subject_id);
          }
        }}
        className="border p-2 rounded w-full"
      >
        <option value="">-- Sélectionner un cours --</option>
        {filteredCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
    </div>
  );
}

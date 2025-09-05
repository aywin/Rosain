"use client";
import { Level, Subject, Course } from "@/components/types";
import { useEffect, useState } from "react";

interface Props {
  levelId: string;
  subjectId: string;
  courseId: string;
  setFormState: (state: any) => void;
}

export default function CourseSelectors({
  levelId,
  subjectId,
  courseId,
  setFormState,
}: Props) {
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    import("@/firebase").then(({ db }) => {
      import("firebase/firestore").then(({ collection, getDocs }) => {
        Promise.all([
          getDocs(collection(db, "levels")),
          getDocs(collection(db, "subjects")),
          getDocs(collection(db, "courses")),
        ]).then(([lSnap, sSnap, cSnap]) => {
          setLevels(lSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Level)));
          setSubjects(sSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Subject)));
          setCourses(cSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Course)));
        });
      });
    });
  }, []);

  const filteredCourses = courses.filter(
    (c) =>
      (!levelId || c.level_id === levelId) &&
      (!subjectId || c.subject_id === subjectId)
  );

  return (
    <div className="flex flex-wrap gap-3">
      {/* Niveau */}
      <select
        className="border px-3 py-2 rounded min-w-[180px]"
        value={levelId}
        onChange={(e) =>
          setFormState((prev: any) => ({
            ...prev,
            level_id: e.target.value,
            course_id: "",
          }))
        }
      >
        <option value="">Sélectionner un niveau</option>
        {levels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>

      {/* Matière */}
      <select
        className="border px-3 py-2 rounded min-w-[180px]"
        value={subjectId}
        onChange={(e) =>
          setFormState((prev: any) => ({
            ...prev,
            subject_id: e.target.value,
            course_id: "",
          }))
        }
      >
        <option value="">Sélectionner une matière</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {/* Cours */}
      <select
        className="border px-3 py-2 rounded min-w-[200px]"
        value={courseId}
        onChange={(e) =>
          setFormState((prev: any) => ({
            ...prev,
            course_id: e.target.value,
          }))
        }
        required
      >
        <option value="">Sélectionner un cours</option>
        {filteredCourses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
    </div>
  );
}

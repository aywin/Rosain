//CourseMultiSelector.tsx
"use client";
import { Level, Subject, Course } from "@/components/types";
import { useEffect, useState } from "react";
import { FaBook, FaTimes } from "react-icons/fa";

interface Props {
  levelId: string;
  subjectId: string;
  courseIds: string[];
  setFormState: (state: any) => void;
}

export default function CourseSelector({
  levelId,
  subjectId,
  courseIds,
  setFormState,
}: Props) {
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");

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
      (!subjectId || c.subject_id === subjectId) &&
      !courseIds.includes(c.id) // Exclure les cours déjà sélectionnés
  );

  const addCourse = (courseId?: string) => {
    const id = courseId || selectedCourseId;
    if (id && !courseIds.includes(id)) {
      setFormState((prev: any) => ({
        ...prev,
        course_ids: [...prev.course_ids, id],
      }));
      setSelectedCourseId("");
    }
  };

  const removeCourse = (courseId: string) => {
    setFormState((prev: any) => ({
      ...prev,
      course_ids: courseIds.filter(id => id !== courseId),
    }));
  };

  const selectedCourses = courses.filter(c => courseIds.includes(c.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {/* Niveau */}
        <select
          title="Sélectionner un niveau"
          className="border px-3 py-2 rounded min-w-[180px]"
          value={levelId}
          onChange={(e) =>
            setFormState((prev: any) => ({
              ...prev,
              level_id: e.target.value,
              course_ids: [],
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
          title="Sélectionner une matière"
          className="border px-3 py-2 rounded min-w-[180px]"
          value={subjectId}
          onChange={(e) =>
            setFormState((prev: any) => ({
              ...prev,
              subject_id: e.target.value,
              course_ids: [],
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
      </div>

      {/* Zone de sélection des cours */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <FaBook className="text-blue-600" />
          Cours associés {courseIds.length > 0 && `(${courseIds.length})`}
        </label>

        {/* Cours sélectionnés */}
        {selectedCourses.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedCourses.map((course) => (
              <div
                key={course.id}
                className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full border border-blue-300"
              >
                <span className="text-sm font-medium">{course.title}</span>
                <button
                  type="button"
                  title="Retirer ce cours"
                  onClick={() => removeCourse(course.id)}
                  className="hover:bg-blue-200 rounded-full p-0.5 transition"
                >
                  <FaTimes size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Ajout de cours */}
        <div className="flex gap-2">
          <select
            title="Ajouter un cours"
            className="border border-gray-300 px-3 py-2 rounded flex-1"
            value=""
            onChange={(e) => { if (e.target.value) addCourse(e.target.value); }}
            disabled={filteredCourses.length === 0}
          >
            <option value="">
              {filteredCourses.length === 0
                ? "Tous les cours disponibles sont sélectionnés"
                : "Sélectionner un cours pour l'ajouter..."}
            </option>
            {filteredCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {courseIds.length === 0 && (
          <p className="text-sm text-gray-500 italic mt-3">
            ℹ️ Sélectionnez au moins un cours pour cet exercice
          </p>
        )}
      </div>
    </div>
  );
}
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import { mapCourseWithNames, Course } from "@/utils/mapCourse";

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const snap = await getDocs(collection(db, "courses"));
      const mapped = await Promise.all(
        snap.docs.map((doc) => mapCourseWithNames(doc.id, doc.data()))
      );
      setCourses(mapped);
      setLoading(false);
    };
    fetchCourses();
  }, []);

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-8">Catalogue des cours</h1>
      {loading ? (
        <div>Chargement...</div>
      ) : courses.length === 0 ? (
        <div>Aucun cours disponible.</div>
      ) : (
        <ul>
          {courses.map((c) => (
            <li key={c.id} className="mb-6 p-4 bg-white rounded shadow">
              <div className="font-bold text-lg mb-1">{c.titre}</div>
              <div className="mb-1 text-gray-700">
                Niveau : <span className="font-semibold">{c.niveau}</span> | Matière :{" "}
                <span className="font-semibold">{c.matiere}</span>
              </div>
              <button
                className="bg-blue-700 text-white px-3 py-1 rounded"
                onClick={() => router.push(`/courses/${c.id}`)}
              >
                Voir le cours
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

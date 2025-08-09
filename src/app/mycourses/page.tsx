"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc
} from "firebase/firestore";
import { mapCourseWithNames, Course } from "@/utils/mapCourse";

export default function MyCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLogged, setNotLogged] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setNotLogged(true);
        setLoading(false);
        return;
      }

      const enrollSnap = await getDocs(
        query(collection(db, "enrollments"), where("id_user", "==", user.uid))
      );
      const enrollments = enrollSnap.docs.map((doc) => doc.data() as { id_course: string });

      const courseList: Course[] = [];

      for (const enr of enrollments) {
        const docSnap = await getDoc(doc(db, "courses", enr.id_course));
        if (docSnap.exists()) {
          const mapped = await mapCourseWithNames(docSnap.id, docSnap.data());
          courseList.push(mapped);
        }
      }

      setCourses(courseList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-10 px-4 text-center">
        <h1 className="text-3xl font-bold mb-8">Mes cours</h1>
        <div>Chargement...</div>
      </div>
    );
  }

  if (notLogged) {
    return (
      <div className="max-w-7xl mx-auto py-10 px-4 text-center">
        <h1 className="text-3xl font-bold mb-8">Mes cours</h1>
        <div>
          Vous devez être connecté pour voir vos cours.{" "}
          <button
            className="ml-2 underline text-blue-700"
            onClick={() => router.push("/login")}
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Mes cours</h1>
      {courses.length === 0 ? (
        <div className="text-center text-lg">
          Vous n'êtes inscrit à aucun cours pour l’instant.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <li
              key={c.id}
              className="bg-white rounded-2xl border border-gray-200 shadow p-6 flex flex-col"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900">{c.titre}</h3>
              <p className="text-sm mb-1 text-gray-700">
                <span className="font-medium">Niveau :</span> {c.niveau || "Inconnu"} |{" "}
                <span className="font-medium">Matière :</span> {c.matiere || "Inconnue"}
              </p>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">{c.description}</p>

              <button
                onClick={() => router.push(`/tuto/${c.id}`)}
                className="mt-auto bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded transition"
              >
                Accéder au cours
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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

      // Récupère les inscriptions de l'utilisateur
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
      <div className="max-w-3xl mx-auto py-10">
        <h1 className="text-2xl font-bold mb-8">Mes cours</h1>
        <div>Chargement...</div>
      </div>
    );
  }

  if (notLogged) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <h1 className="text-2xl font-bold mb-8">Mes cours</h1>
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
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-8">Mes cours</h1>
      {courses.length === 0 ? (
        <div>Vous n'êtes inscrit à aucun cours pour l’instant.</div>
      ) : (
        <ul>
          {courses.map((c) => (
            <li key={c.id} className="mb-6 p-4 bg-white rounded shadow">
              <div className="font-bold text-lg mb-1">{c.titre}</div>
              <div className="mb-1 text-gray-700">
                Niveau : <span className="font-semibold">{c.niveau}</span> | Matière :{" "}
                <span className="font-semibold">{c.matiere}</span>
              </div>
              <div className="mb-2">{c.description}</div>
              <button
                className="bg-green-700 text-white px-3 py-1 rounded"
                onClick={() => router.push(`/tuto/${c.id}`)}
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

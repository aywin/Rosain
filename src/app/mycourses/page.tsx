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
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { mapCourseWithNames, Course } from "@/utils/mapCourse";
import CourseCard from "@/components/course/CourseCard";
import AlertModal from "@/components/ui/AlertModal";
import { FaSpinner } from "react-icons/fa";

interface CourseWithStatus extends Course {
  enrolled: boolean;
  progressStatus: "not_started" | "in_progress" | "done";
}

export default function MyCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLogged, setNotLogged] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [alertCourseId, setAlertCourseId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setNotLogged(true);
        setLoading(false);
        return;
      }
      setUserId(user.uid);

      try {
        const enrollSnap = await getDocs(
          query(collection(db, "enrollments"), where("id_user", "==", user.uid))
        );
        const enrollments = enrollSnap.docs.map(
          (doc) => doc.data() as { id_course: string }
        );

        const courseList: CourseWithStatus[] = [];

        for (const enr of enrollments) {
          const docSnap = await getDoc(doc(db, "courses", enr.id_course));
          if (!docSnap.exists()) continue;

          const mapped = await mapCourseWithNames(docSnap.id, docSnap.data());

          const qProgress = query(
            collection(db, "progress"),
            where("id_user", "==", user.uid),
            where("id_course", "==", docSnap.id)
          );
          const progressSnap = await getDocs(qProgress);

          let progressStatus: "not_started" | "in_progress" | "done" =
            "not_started";
          if (!progressSnap.empty) {
            const data = progressSnap.docs[0].data();
            progressStatus = data.status || "not_started";
          }

          courseList.push({
            ...mapped,
            enrolled: true,
            progressStatus,
          });
        }

        const uniqueCourses = Array.from(
          new Map(courseList.map((c) => [c.id, c])).values()
        );

        uniqueCourses.sort((a, b) => {
          if (a.niveau !== b.niveau) return a.niveau.localeCompare(b.niveau);
          if (a.matiere !== b.matiere) return a.matiere.localeCompare(b.matiere);
          return a.titre.localeCompare(b.titre);
        });

        setCourses(uniqueCourses);
      } catch (err) {
        console.error("Erreur récupération mes cours :", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUnenrollClick = (courseId: string) => setAlertCourseId(courseId);
  const handleConfirmUnenroll = async () => {
    if (!alertCourseId || !userId) return;

    try {
      const qEnroll = query(
        collection(db, "enrollments"),
        where("id_user", "==", userId),
        where("id_course", "==", alertCourseId)
      );
      const enrollSnap = await getDocs(qEnroll);
      for (const docSnap of enrollSnap.docs)
        await deleteDoc(doc(db, "enrollments", docSnap.id));

      const qProgress = query(
        collection(db, "progress"),
        where("id_user", "==", userId),
        where("id_course", "==", alertCourseId)
      );
      const progressSnap = await getDocs(qProgress);
      for (const docSnap of progressSnap.docs)
        await deleteDoc(doc(db, "progress", docSnap.id));

      setCourses((prev) => prev.filter((c) => c.id !== alertCourseId));
    } catch (err) {
      console.error("Erreur lors de la désinscription :", err);
    } finally {
      setAlertCourseId(null);
    }
  };
  const handleCancelUnenroll = () => setAlertCourseId(null);

  if (loading) return <LoadingHero />;
  if (notLogged) return <NotLoggedHero router={router} />;
  if (courses.length === 0) return <NoCoursesHero />;

  const grouped: Record<string, Record<string, CourseWithStatus[]>> = {};
  courses.forEach((c) => {
    if (!grouped[c.niveau]) grouped[c.niveau] = {};
    if (!grouped[c.niveau][c.matiere]) grouped[c.niveau][c.matiere] = [];
    grouped[c.niveau][c.matiere].push(c);
  });

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800">
      {/* Hero */}
      <section className="bg-gradient-to-r from-[#0D1B2A] to-[#1B9AAA] py-20 text-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold mb-4">Mes cours</h1>
          <p className="text-lg opacity-90 max-w-3xl mx-auto">
            Suivez vos cours et progressez étape par étape.
          </p>
        </div>
      </section>

      {/* Cours */}
      <section className="max-w-7xl mx-auto px-6 py-16 space-y-12">
        {Object.entries(grouped).map(([niveau, matieres]) => (
          <div key={niveau}>
            <h2 className="text-3xl font-bold text-[#1B9AAA] mb-6 border-b-2 border-[#0D1B2A] pb-2">
              {niveau}
            </h2>
            {Object.entries(matieres).map(([matiere, coursList]) => (
              <div key={matiere} className="mb-10">
                <h3 className="text-2xl font-semibold text-[#0D1B2A] mb-4">
                  {matiere}
                </h3>

                {/* grid centrée */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center">
                  {coursList.map((course, idx) => (
                    <div
                      key={`${course.id}-${idx}`}
                      className="justify-self-center"
                    >
                      {/* carte + bouton */}
                      <div className="inline-flex flex-col max-w-sm transition hover:scale-105 duration-200 shadow-lg rounded-2xl bg-white">
                        <CourseCard
                          course={course}
                          onEnroll={() => router.push(`/tuto/${course.id}`)}
                        />

                        <button
                          onClick={() => handleUnenrollClick(course.id)}
                          className="mt-2 bg-[#4CAF50] hover:bg-red-600 text-white font-semibold text-sm py-2 w-full rounded-b-2xl transition"
                        >
                          ✕ Se désinscrire
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>

      {alertCourseId && (
        <AlertModal
          message="Une fois désinscrit, l'état de progression sera perdu. Si vous revenez, vous recommencerez à 0. Voulez-vous vraiment vous désinscrire ?"
          onConfirm={handleConfirmUnenroll}
          onCancel={handleCancelUnenroll}
        />
      )}
    </div>
  );
}

// ---------------------------
// Composants secondaires
// ---------------------------

function LoadingHero() {
  return (
    <div className="bg-gradient-to-r from-[#0D1B2A] to-[#1B9AAA] min-h-screen flex flex-col justify-center items-center text-white text-center px-6">
      <h1 className="text-5xl font-bold mb-6">Mes cours</h1>
      <FaSpinner className="animate-spin text-4xl mb-4" />
      <p className="text-lg">Chargement en cours...</p>
    </div>
  );
}

function NotLoggedHero({ router }: { router: any }) {
  return (
    <div className="max-w-5xl mx-auto py-20 px-6 text-center">
      <h1 className="text-4xl font-bold mb-4 text-[#0D1B2A]">Mes cours</h1>
      <p className="mb-4 text-gray-700">
        Vous devez être connecté pour voir vos cours.
      </p>
      <button
        className="bg-[#1B9AAA] hover:bg-[#0D1B2A] text-white px-4 py-2 rounded font-semibold transition"
        onClick={() => router.push("/login")}
      >
        Se connecter
      </button>
    </div>
  );
}

function NoCoursesHero() {
  return (
    <div className="max-w-5xl mx-auto py-20 px-6 text-center">
      <h1 className="text-4xl font-bold mb-4 text-[#0D1B2A]">Mes cours</h1>
      <p className="text-gray-700">
        Vous n'êtes inscrit à aucun cours pour l’instant.
      </p>
    </div>
  );
}

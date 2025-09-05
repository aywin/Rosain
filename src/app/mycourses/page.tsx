"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { collection, getDocs, query, where, doc, getDoc, deleteDoc } from "firebase/firestore";
import { mapCourseWithNames, Course } from "@/utils/mapCourse";
import CourseCard from "@/components/course/CourseCard";
import AlertModal from "@/components/ui/AlertModal"; // <-- Import du modal

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

  // Pour le modal de désinscription
  const [alertCourseId, setAlertCourseId] = useState<string | null>(null);

  // Récupérer les cours de l'utilisateur
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setNotLogged(true);
        setLoading(false);
        return;
      }

      setUserId(user.uid);

      try {
        // Récupérer les inscriptions
        const enrollSnap = await getDocs(
          query(collection(db, "enrollments"), where("id_user", "==", user.uid))
        );
        const enrollments = enrollSnap.docs.map((doc) => doc.data() as { id_course: string });

        const courseList: CourseWithStatus[] = [];

        for (const enr of enrollments) {
          const docSnap = await getDoc(doc(db, "courses", enr.id_course));
          if (!docSnap.exists()) continue;

          const mapped = await mapCourseWithNames(docSnap.id, docSnap.data());

          // Vérifier progression
          const qProgress = query(
            collection(db, "progress"),
            where("id_user", "==", user.uid),
            where("id_course", "==", docSnap.id)
          );
          const progressSnap = await getDocs(qProgress);
          let progressStatus: "not_started" | "in_progress" | "done" = "not_started";
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

        // Trier par niveau → matière → titre
        courseList.sort((a, b) => {
          if (a.niveau !== b.niveau) return a.niveau.localeCompare(b.niveau);
          if (a.matiere !== b.matiere) return a.matiere.localeCompare(b.matiere);
          return a.titre.localeCompare(b.titre);
        });

        setCourses(courseList);
      } catch (err) {
        console.error("Erreur récupération mes cours :", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // -------------------
  // Gestion désinscription avec modal
  // -------------------

  const handleUnenrollClick = (courseId: string) => {
    setAlertCourseId(courseId); // ouvre la popup
  };

  const handleConfirmUnenroll = async () => {
    if (!alertCourseId || !userId) return;

    try {
      // Supprimer l'inscription
      const qEnroll = query(
        collection(db, "enrollments"),
        where("id_user", "==", userId),
        where("id_course", "==", alertCourseId)
      );
      const enrollSnap = await getDocs(qEnroll);
      for (const docSnap of enrollSnap.docs) {
        await deleteDoc(doc(db, "enrollments", docSnap.id));
      }

      // Supprimer le progrès associé
      const qProgress = query(
        collection(db, "progress"),
        where("id_user", "==", userId),
        where("id_course", "==", alertCourseId)
      );
      const progressSnap = await getDocs(qProgress);
      for (const docSnap of progressSnap.docs) {
        await deleteDoc(doc(db, "progress", docSnap.id));
      }

      // Mettre à jour le state pour enlever le cours
      setCourses((prev) => prev.filter((c) => c.id !== alertCourseId));
    } catch (err) {
      console.error("Erreur lors de la désinscription :", err);
    } finally {
      setAlertCourseId(null); // ferme la popup
    }
  };

  const handleCancelUnenroll = () => setAlertCourseId(null);

  // -------------------
  // Affichage
  // -------------------

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

  if (courses.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-10 px-4 text-center">
        <h1 className="text-3xl font-bold mb-8">Mes cours</h1>
        <div>Vous n'êtes inscrit à aucun cours pour l’instant.</div>
      </div>
    );
  }

  // Regrouper par niveau → matière
  const grouped: Record<string, Record<string, CourseWithStatus[]>> = {};
  courses.forEach((c) => {
    if (!grouped[c.niveau]) grouped[c.niveau] = {};
    if (!grouped[c.niveau][c.matiere]) grouped[c.niveau][c.matiere] = [];
    grouped[c.niveau][c.matiere].push(c);
  });

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Mes cours</h1>

      {Object.entries(grouped).map(([niveau, matieres]) => (
        <section key={niveau}>
          <h2 className="text-3xl font-bold text-blue-700 mb-6 border-b pb-2">{niveau}</h2>
          {Object.entries(matieres).map(([matiere, coursList]) => (
            <div key={matiere} className="mb-10">
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">{matiere}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {coursList.map((course) => (
                  <div key={course.id} className="flex flex-col">
                    <CourseCard
                      course={course}
                      onEnroll={() => router.push(`/tuto/${course.id}`)}
                    />
                    {/* Bouton de désinscription uniquement pour MyCourses */}
                    <button
                      onClick={() => handleUnenrollClick(course.id)}
                      className="mt-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold px-1 py-0.5 rounded transition w-max"
                    >
                      ✕ Se désinscrire
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}

      {/* Modal de confirmation */}
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

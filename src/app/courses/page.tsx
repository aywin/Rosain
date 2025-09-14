"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/firebase";
import { mapCourseWithNames } from "@/utils/mapCourse";
import CourseCard from "@/components/course/CourseCard";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

interface CourseWithStatus {
  id: string;
  titre: string;
  description: string;
  niveau: string;
  matiere: string;
  img?: string;
  enrolled: boolean;
  progressStatus: "not_started" | "in_progress" | "done";
  order: number;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState<Record<string, boolean>>({});

  // Récupérer utilisateur
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return () => unsubscribe();
  }, []);

  // Récupérer cours enrichis
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const snap = await getDocs(collection(db, "courses"));
        const coursesData: any[] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const enriched: CourseWithStatus[] = [];

        for (const c of coursesData) {
          const mapped = await mapCourseWithNames(c.id, c);

          let enrolled = false;
          let progressStatus: "not_started" | "in_progress" | "done" = "not_started";

          if (userId) {
            const qEnroll = query(
              collection(db, "enrollments"),
              where("id_user", "==", userId),
              where("id_course", "==", c.id)
            );
            const enrollSnap = await getDocs(qEnroll);
            enrolled = !enrollSnap.empty;

            const qProgress = query(
              collection(db, "progress"),
              where("id_user", "==", userId),
              where("id_course", "==", c.id)
            );
            const progressSnap = await getDocs(qProgress);
            if (!progressSnap.empty) {
              progressStatus = progressSnap.docs[0].data().status || "not_started";
            }
          }

          enriched.push({
            id: mapped.id,
            titre: mapped.titre,
            description: mapped.description,
            niveau: mapped.niveau,
            matiere: mapped.matiere,
            img: mapped.img,
            order: c.order || 0,
            enrolled,
            progressStatus,
          });
        }

        // Tri par niveau → matière → order
        enriched.sort((a, b) => {
          if (a.niveau !== b.niveau) return a.niveau.localeCompare(b.niveau);
          if (a.matiere !== b.matiere) return a.matiere.localeCompare(b.matiere);
          return a.order - b.order;
        });

        setCourses(enriched);
      } catch (err) {
        console.error("Erreur récupération cours :", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [userId]);

  const handleEnroll = async (courseId: string) => {
    if (!userId) return;
    try {
      await addDoc(collection(db, "enrollments"), {
        id_user: userId,
        id_course: courseId,
        date_inscription: serverTimestamp(),
      });

      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId ? { ...c, enrolled: true, progressStatus: "not_started" } : c
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const toggleShowMore = (matiere: string) => {
    setShowMore((prev) => ({
      ...prev,
      [matiere]: !prev[matiere],
    }));
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg font-medium text-gray-600 animate-pulse">
          Chargement des cours…
        </p>
      </div>
    );
  if (courses.length === 0)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg font-medium text-gray-600">Aucun cours disponible.</p>
      </div>
    );

  // Regroupement niveau → matière
  const grouped: Record<string, Record<string, CourseWithStatus[]>> = {};
  courses.forEach((c) => {
    if (!grouped[c.niveau]) grouped[c.niveau] = {};
    if (!grouped[c.niveau][c.matiere]) grouped[c.niveau][c.matiere] = [];
    grouped[c.niveau][c.matiere].push(c);
  });

  return (
    <div className="p-6 sm:p-8 lg:p-12 bg-gray-50 min-h-screen">
      {Object.entries(grouped).map(([niveau, matieres]) => (
        <section key={niveau} className="mb-12">
          {/* Niveau */}
          <h2 className="text-4xl font-extrabold text-blue-800 mb-6 pb-3 border-b-2 border-blue-200">
            {niveau}
          </h2>

          {Object.entries(matieres).map(([matiere, coursList]) => (
            <div
              key={matiere}
              className="mb-10 p-4 rounded-xl bg-gray-100"
            >
              {/* Matière */}
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                {matiere}
              </h3>

              {/* Grille responsive, max 5 cartes par ligne */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {(showMore[matiere] ? coursList : coursList.slice(0, 5)).map(
                  (course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      onEnroll={() => handleEnroll(course.id)}
                    />
                  )
                )}
              </div>

              {/* Bouton "Voir plus / Voir moins" */}
              {coursList.length > 5 && (
                <div className="flex justify-center">
                  <button
                    onClick={() => toggleShowMore(matiere)}
                    className="mt-6 flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-all duration-300"
                  >
                    {showMore[matiere] ? "Voir moins" : "Voir plus"}
                    {showMore[matiere] ? (
                      <ChevronUpIcon className="ml-2 h-5 w-5" />
                    ) : (
                      <ChevronDownIcon className="ml-2 h-5 w-5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

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

  // récupérer utilisateur
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return () => unsubscribe();
  }, []);

  // récupérer cours enrichis
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
            // vérifier inscription
            const qEnroll = query(
              collection(db, "enrollments"),
              where("id_user", "==", userId),
              where("id_course", "==", c.id)
            );
            const enrollSnap = await getDocs(qEnroll);
            enrolled = !enrollSnap.empty;

            // vérifier progression
            const qProgress = query(
              collection(db, "progress"),
              where("id_user", "==", userId),
              where("id_course", "==", c.id)
            );
            const progressSnap = await getDocs(qProgress);
            if (!progressSnap.empty) {
              const data = progressSnap.docs[0].data();
              progressStatus = data.status || "not_started";
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

        // trier par niveau → matière → order
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

  if (loading) return <p className="p-12">Chargement des cours…</p>;
  if (courses.length === 0) return <p className="p-12">Aucun cours disponible.</p>;

  // regroupement niveau → matière
  const grouped: Record<string, Record<string, CourseWithStatus[]>> = {};
  courses.forEach((c) => {
    if (!grouped[c.niveau]) grouped[c.niveau] = {};
    if (!grouped[c.niveau][c.matiere]) grouped[c.niveau][c.matiere] = [];
    grouped[c.niveau][c.matiere].push(c);
  });

  return (
    <div className="p-6 space-y-12">
      {Object.entries(grouped).map(([niveau, matieres]) => (
        <section key={niveau}>
          {/* Section niveau */}
          <h2 className="text-3xl font-bold text-blue-700 mb-6 border-b pb-2">
            {niveau}
          </h2>

          {Object.entries(matieres).map(([matiere, coursList]) => (
            <div key={matiere} className="mb-10">
              {/* Section matière */}
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                {matiere}
              </h3>

              {/* Liste cours bien structurée */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {coursList.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onEnroll={() => handleEnroll(course.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

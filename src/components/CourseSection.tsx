"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "@/firebase";
import CourseCard from "@/components/course/CourseCard";
import { mapCourseWithNames } from "@/utils/mapCourse";

interface CourseWithStatus {
  id: string;
  titre: string;
  description: string;
  niveau: string;
  matiere: string;
  img?: string;
  enrolled: boolean;
  progressStatus: "not_started" | "in_progress" | "done";
}

export default function CourseSection() {
  const [courses, setCourses] = useState<CourseWithStatus[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const colors = {
  darkBlue: "#25364C",
  primaryBlue: "#1F77B0",
  primaryBlueDark: "#1B5E8B",
  primaryBlueHover: "#155E8B",
  lightGray: "#3c6691a1",
  softHover: "#E5F0FA",
  white: "#FFFFFF",
};


  // récupération utilisateur connecté
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return () => unsubscribe();
  }, []);

  // récupération des cours avec statut
  useEffect(() => {
    async function fetchCourses() {
      try {
        const snap = await getDocs(collection(db, "courses"));
        const baseCourses = snap.docs.slice(0, 10).map((doc) => ({ id: doc.id, ...doc.data() }));

        const enriched: CourseWithStatus[] = [];

        for (const c of baseCourses) {
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
              const data = progressSnap.docs[0].data();
              progressStatus = (data.status as "not_started" | "in_progress" | "done") || "not_started";
            }
          }

          enriched.push({
            id: mapped.id,
            titre: mapped.titre,
            description: mapped.description,
            niveau: mapped.niveau,
            matiere: mapped.matiere,
            img: mapped.img,
            enrolled,
            progressStatus,
          });
        }

        setCourses(enriched);
      } catch (err) {
        console.error("Erreur lors du chargement des cours :", err);
      }
    }

    fetchCourses();
  }, [userId]);

  const visibleCourses = courses.slice(0, 3);
  const remaining = courses.length - 3;

  return (
    <section style={{ backgroundColor: colors.lightGray }} className="py-14 px-4 text-[oklch(25%_0.02_250)]">
      <div className="max-w-6xl mx-auto">
        <h2 style={{ color: colors.darkBlue }} className="text-3xl font-semibold mb-8 text-center">
          Cours populaires
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {visibleCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}

          {remaining > 0 && (
            <div
              style={{ color: colors.white, backgroundColor: colors.primaryBlueDark }}
              className="flex items-center justify-center rounded-xl shadow p-6 text-lg font-medium hover:bg-[#155E8B] transition-colors duration-200"
            >
              +{remaining}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "@/firebase";
import CourseCard from "@/components/course/CourseCard";
import { mapCourseWithNames } from "@/utils/mapCourse";
import Link from "next/link";
import { FaFire, FaArrowRight, FaSpinner } from "react-icons/fa";

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
  const [loading, setLoading] = useState(true);

  // Couleurs du logo
  const colors = {
    green: "#2C5F4D",
    greenLight: "#E8F5E9",
    navy: "#00205B",
    navyLight: "#E3F2FD",
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return () => unsubscribe();
  }, []);

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
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, [userId]);

  const visibleCourses = courses.slice(0, 3);
  const remaining = courses.length - 3;

  if (loading) {
    return (
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <FaSpinner className="animate-spin text-5xl mx-auto mb-4" style={{ color: colors.navy }} />
          <p className="text-lg text-gray-600">Chargement des cours...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FaFire className="text-3xl md:text-4xl text-orange-500" />
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900">
              Cours populaires
            </h2>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Découvrez les cours les plus suivis par notre communauté
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {visibleCourses.map((course) => (
            <div key={course.id} className="transform hover:scale-105 transition-transform duration-300">
              <CourseCard course={course} />
            </div>
          ))}

          {/* Carte "Voir plus" */}
          {remaining > 0 && (
            <Link
              href="/courses"
              className="group relative bg-white hover:bg-gray-50 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-gray-200"
            >
              <div className="relative h-full flex flex-col items-center justify-center p-8 min-h-[400px]">
                <div
                  className="mb-6 w-24 h-24 rounded-full flex items-center justify-center shadow-md"
                  style={{ backgroundColor: colors.navyLight }}
                >
                  <span className="text-4xl font-bold" style={{ color: colors.navy }}>
                    +{remaining}
                  </span>
                </div>

                <h3 className="text-2xl font-bold mb-2 text-gray-800">Plus de cours</h3>
                <p className="text-gray-600 text-center mb-6">
                  Explorez {remaining} cours supplémentaires
                </p>

                <div
                  className="flex items-center gap-2 text-lg font-semibold group-hover:gap-4 transition-all"
                  style={{ color: colors.navy }}
                >
                  <span>Voir tout</span>
                  <FaArrowRight className="transform group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* CTA Button */}
        <div className="text-center mt-12">
          <Link
            href="/courses"
            className="inline-flex items-center gap-3 px-8 py-4 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-lg active:scale-95"
            style={{ backgroundColor: colors.green }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1e4d3c"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.green}
          >
            <span>Voir tous les cours</span>
            <FaArrowRight className="text-xl" />
          </Link>
        </div>
      </div>
    </section>
  );
}
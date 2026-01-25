// front/src/components/CourseSection.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, limit, getCountFromServer } from "firebase/firestore";
import { db, auth } from "@/firebase";
import CourseCard from "@/components/course/CourseCard";
import { loadLevelsAndSubjects, mapCourseWithNamesSync } from "@/utils/mapCourse";
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
  const [totalCount, setTotalCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        // ⚡ OPTIMISATION 1 : Charger levels et subjects UNE FOIS (2 requêtes)
        const { levelsCache, subjectsCache } = await loadLevelsAndSubjects();

        // ⚡ OPTIMISATION 2 : Compter et charger 3 cours (2 requêtes)
        const [countSnapshot, coursesSnap] = await Promise.all([
          getCountFromServer(collection(db, "courses")),
          getDocs(query(collection(db, "courses"), limit(3)))
        ]);

        const total = countSnapshot.data().count;
        setTotalCount(total);

        const baseCourses = coursesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // ⚡ OPTIMISATION 3 : Batch loading enrollments et progress (2 requêtes si connecté)
        let enrollmentsMap = new Map<string, boolean>();
        let progressMap = new Map<string, "not_started" | "in_progress" | "done">();

        if (userId) {
          const [enrollSnap, progressSnap] = await Promise.all([
            getDocs(query(collection(db, "enrollments"), where("id_user", "==", userId))),
            getDocs(query(collection(db, "progress"), where("id_user", "==", userId)))
          ]);

          enrollSnap.docs.forEach(doc => {
            enrollmentsMap.set(doc.data().id_course, true);
          });

          progressSnap.docs.forEach(doc => {
            const data = doc.data();
            progressMap.set(data.id_course, data.status || "not_started");
          });
        }

        // ⚡ OPTIMISATION 4 : Mapping SANS requêtes supplémentaires (0 requêtes)
        const enriched: CourseWithStatus[] = baseCourses.map(c => {
          const mapped = mapCourseWithNamesSync(c.id, c, levelsCache, subjectsCache);

          return {
            ...mapped,
            enrolled: enrollmentsMap.has(c.id),
            progressStatus: progressMap.get(c.id) || "not_started",
          };
        });

        setCourses(enriched);
      } catch (err) {
        console.error("Erreur lors du chargement des cours :", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, [userId]);

  const remaining = totalCount - 3;

  if (loading) {
    return (
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <FaSpinner className="animate-spin text-5xl mx-auto mb-4" style={{ color: colors.navy }} />
          <p className="text-lg text-gray-600">Chargement des cours...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FaFire className="text-4xl text-orange-500" />
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900">
              Cours populaires
            </h2>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Découvrez les cours les plus suivis par notre communauté
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
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
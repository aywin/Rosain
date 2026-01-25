// front/src/app/courses/page.tsx
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
import { loadLevelsAndSubjects, mapCourseWithNamesSync } from "@/utils/mapCourse";
import CourseCard from "@/components/course/CourseCard";
import {
  FaChevronDown,
  FaChevronUp,
  FaGraduationCap,
  FaBook,
  FaSpinner
} from "react-icons/fa";

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
    const fetchCourses = async () => {
      try {
        // ⚡ OPTIMISATION 1 : Charger levels et subjects UNE FOIS (2 requêtes)
        const { levelsCache, subjectsCache } = await loadLevelsAndSubjects();

        // ⚡ OPTIMISATION 2 : Charger TOUS les cours en une fois (1 requête)
        const coursesSnap = await getDocs(collection(db, "courses"));
        const coursesData: any[] = coursesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // ⚡ OPTIMISATION 3 : Charger TOUS les enrollments et progress de l'utilisateur (2 requêtes)
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

        // ⚡ OPTIMISATION 4 : Mapper les cours SANS requêtes supplémentaires (0 requêtes)
        const enriched: CourseWithStatus[] = coursesData.map(c => {
          const mapped = mapCourseWithNamesSync(c.id, c, levelsCache, subjectsCache);

          return {
            ...mapped,
            order: c.order || 0,
            enrolled: enrollmentsMap.has(c.id),
            progressStatus: progressMap.get(c.id) || "not_started",
          };
        });

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

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
        <FaSpinner className="animate-spin text-5xl mb-4" style={{ color: colors.navy }} />
        <p className="text-xl font-semibold text-gray-700">Chargement des cours...</p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <FaBook className="text-6xl text-gray-400 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-700">Aucun cours disponible.</p>
        </div>
      </div>
    );
  }

  const grouped: Record<string, Record<string, CourseWithStatus[]>> = {};
  courses.forEach((c) => {
    if (!grouped[c.niveau]) grouped[c.niveau] = {};
    if (!grouped[c.niveau][c.matiere]) grouped[c.niveau][c.matiere] = [];
    grouped[c.niveau][c.matiere].push(c);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            Catalogue de cours
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Découvrez tous nos cours organisés par niveau et matière
          </p>
        </div>

        {/* Cours par niveau */}
        {Object.entries(grouped).map(([niveau, matieres]) => (
          <section key={niveau} className="mb-16">
            {/* En-tête niveau */}
            <div className="flex items-center gap-4 mb-8">
              <div
                className="flex items-center gap-3 text-white px-6 py-3 rounded-lg shadow-md"
                style={{ backgroundColor: colors.navy }}
              >
                <FaGraduationCap className="text-2xl" />
                <h2 className="text-2xl md:text-3xl font-bold">{niveau}</h2>
              </div>
              <div className="flex-1 h-0.5 bg-gray-300 rounded-full" />
            </div>

            {/* Matières */}
            {Object.entries(matieres).map(([matiere, coursList]) => (
              <div
                key={matiere}
                className="mb-10 bg-white rounded-xl shadow-md overflow-hidden border border-gray-200"
              >
                {/* En-tête matière */}
                <div
                  className="px-6 py-4 border-b border-gray-200"
                  style={{ backgroundColor: colors.navyLight }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FaBook className="text-xl" style={{ color: colors.navy }} />
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                        {matiere}
                      </h3>
                    </div>
                    <span
                      className="px-3 py-1 rounded-full text-sm font-semibold shadow-sm"
                      style={{ backgroundColor: "white", color: colors.navy }}
                    >
                      {coursList.length} cours
                    </span>
                  </div>
                </div>

                {/* Grille de cours */}
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {(showMore[matiere] ? coursList : coursList.slice(0, 8)).map(
                      (course) => (
                        <CourseCard
                          key={course.id}
                          course={course}
                          onEnroll={() => handleEnroll(course.id)}
                        />
                      )
                    )}
                  </div>

                  {/* Bouton voir plus/moins */}
                  {coursList.length > 8 && (
                    <div className="mt-8 flex justify-center">
                      <button
                        onClick={() => toggleShowMore(matiere)}
                        className="group flex items-center gap-3 px-6 py-3 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 active:scale-95"
                        style={{ backgroundColor: colors.green }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1e4d3c"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.green}
                      >
                        <span>
                          {showMore[matiere]
                            ? "Voir moins"
                            : `Voir ${coursList.length - 8} cours de plus`}
                        </span>
                        {showMore[matiere] ? (
                          <FaChevronUp className="text-lg" />
                        ) : (
                          <FaChevronDown className="text-lg" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
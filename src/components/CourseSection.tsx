// components/CourseSection.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import CourseCard from "@/components/course/CourseCard";
import { mapCourseWithNames, Course } from "@/utils/mapCourse";

export default function CourseSection() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const snap = await getDocs(collection(db, "courses"));
        const mapped = await Promise.all(
          snap.docs.slice(0, 10).map((doc) => mapCourseWithNames(doc.id, doc.data()))
        );
        setCourses(mapped);
      } catch (err) {
        console.error("Erreur lors du chargement des cours :", err);
      }
    }

    fetchCourses();
  }, []);

  const visibleCourses = courses.slice(0, 3);
  const remaining = courses.length - 3;

  return (
    <section className="bg-[oklch(97%_0.04_350)] py-14 px-4 text-[oklch(25%_0.02_250)]">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-semibold mb-8 text-center">Cours populaires</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {visibleCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}

          {remaining > 0 && (
            <div className="flex items-center justify-center bg-white rounded-xl shadow p-6 text-lg font-medium text-[oklch(30%_0.02_250)]">
              +{remaining}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

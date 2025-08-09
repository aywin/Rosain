"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import { mapCourseWithNames, Course } from "@/utils/mapCourse";
import CourseCard from "@/components/course/CourseCard";

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const snap = await getDocs(collection(db, "courses"));
      const mapped = await Promise.all(
        snap.docs.map((doc) => mapCourseWithNames(doc.id, doc.data()))
      );
      setCourses(mapped);
      setLoading(false);
    };
    fetchCourses();
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-8 text-center">Catalogue des cours</h1>

      {loading ? (
        <div className="text-center">Chargement...</div>
      ) : courses.length === 0 ? (
        <div className="text-center">Aucun cours disponible.</div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <li key={course.id} className="w-full">
              <CourseCard course={course} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

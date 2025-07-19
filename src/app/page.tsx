"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import Header from "@/components/layout/Header";
import CourseCard from "@/components/course/CourseCard";
import BlogSection from "@/components/blog/BlogSection";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  titre: string;
  description: string;
  id_niveau: string;
  id_matiere: string;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(u => setUser(u));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      const snap = await getDocs(collection(db, "courses"));
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
      setLoading(false);
    };
    fetchCourses();
  }, []);

  return (
    <div className="max-w-3xl mx-auto py-4 px-2">
      <Header />
      <section className="mb-10">
        <div className="bg-yellow-100 p-4 rounded mb-2 text-sm">
          <strong>Bienvenue !</strong> Découvrez nos cours, articles, et conseils pour progresser.
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-4">Cours récents</h2>
        {loading ? (
          <div>Chargement…</div>
        ) : courses.length === 0 ? (
          <div>Aucun cours pour le moment.</div>
        ) : (
          <div>
            {courses.slice(0, 3).map(course => (
              <CourseCard key={course.id} course={course} locked={!user} />
            ))}
          </div>
        )}
      </section>
      <BlogSection />
    </div>
  );
}

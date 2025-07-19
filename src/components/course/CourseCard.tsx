"use client";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  titre: string;
  description: string;
  id_niveau: string;
  id_matiere: string;
}
interface Props {
  course: Course;
  locked?: boolean;
}

export default function CourseCard({ course, locked }: Props) {
  const router = useRouter();
  return (
    <div className="mb-5 p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition">
      <div className="font-bold text-lg mb-1">{course.titre}</div>
      <div className="mb-2 text-gray-500 text-sm">
        <span className="font-semibold">Niveau :</span> {course.id_niveau}{" "}
        | <span className="font-semibold">Matière :</span> {course.id_matiere}
      </div>
      <div className="mb-3">{course.description}</div>
      <button
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded"
        onClick={() => locked ? router.push("/login") : router.push(`/courses/${course.id}`)}
      >
        {locked ? "Se connecter pour voir" : "Voir ce cours"}
      </button>
    </div>
  );
}

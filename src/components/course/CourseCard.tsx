"use client";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  titre: string;
  description: string;
  niveau: string;   // nom lisible
  matiere: string;  // nom lisible
}

interface Props {
  course: Course;
  locked?: boolean;
}

export default function CourseCard({ course, locked }: Props) {
  const router = useRouter();

  return (
    <div className="mb-6 p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition w-full">
      <h3 className="font-bold text-lg mb-2 break-words">{course.titre}</h3>

      <p className="text-sm text-gray-500 mb-2">
        <span className="font-medium">Niveau :</span> {course.niveau || "Inconnu"}{" "}
        | <span className="font-medium">Matière :</span> {course.matiere || "Inconnue"}
      </p>

      <p className="text-sm text-gray-700 mb-4 break-words">{course.description}</p>

      <button
        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        onClick={() =>
          locked
            ? router.push("/login")
            : router.push(`/courses/${course.id}`)
        }
      >
        {locked ? "Se connecter pour voir" : "Voir ce cours"}
      </button>
    </div>
  );
}

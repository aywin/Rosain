"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { freeCourseIds } from "@/utils/freeCourses"; // ✅ importe la liste

interface Course {
  id: string;
  titre: string;
  img?: string;
  enrolled?: boolean;
  progressStatus?: "not_started" | "in_progress" | "done";
}

interface Props {
  course: Course;
  onEnroll?: () => void;
}

export default function CourseCard({ course, onEnroll }: Props) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  const handleMainButton = () => {
    // ✅ Cours libre → accès direct sans login
    if (freeCourseIds.includes(course.id)) {
      router.push(`/tuto/${course.id}`);
      return;
    }

    // 🔐 Sinon, il faut être connecté
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // 🧾 Si connecté :
    if (!course.enrolled) {
      onEnroll?.();
    } else {
      router.push(`/tuto/${course.id}`);
    }
  };

  const defaultImgUrl =
    "https://myschool-maroc.com/wp-content/uploads/2023/11/medium-shot-boy-portrait-with-graduation-background-768x748.jpg";

  let buttonLabel = freeCourseIds.includes(course.id)
    ? "Accès libre"
    : "S'inscrire";

  let buttonColor = freeCourseIds.includes(course.id)
    ? "bg-green-600 text-white"
    : "bg-gray-500 text-white";

  let badge = freeCourseIds.includes(course.id) ? (
    <span className="px-1.5 py-0.5 text-[10px] rounded bg-green-100 text-green-700">
      Libre
    </span>
  ) : (
    <span className="px-1.5 py-0.5 text-[10px] rounded bg-gray-200 text-gray-600">
      Nouveau
    </span>
  );

  let cardClass = "bg-white border border-gray-200 text-gray-800";
  let customStyle: React.CSSProperties = {};

  if (course.enrolled) {
    switch (course.progressStatus) {
      case "not_started":
        buttonLabel = "Commencer";
        buttonColor = "bg-white text-pink-800";
        badge = (
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-white text-pink-800">
            Non commencé
          </span>
        );
        cardClass = "bg-pink-800 border border-pink-900 text-white";
        break;

      case "in_progress":
        buttonLabel = "Continuer";
        buttonColor = "bg-white text-[#00205B]";
        badge = (
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-white text-[#00205B]">
            En cours
          </span>
        );
        customStyle = {
          backgroundColor: "#00205B",
          borderColor: "#001A4D",
          color: "white",
        };
        break;

      case "done":
        buttonLabel = "Revoir";
        buttonColor = "bg-white text-green-800";
        badge = (
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-white text-green-800">
            Terminé
          </span>
        );
        cardClass = "bg-green-800 border border-green-900 text-white";
        break;
    }
  }

  return (
    <div
      className={`group p-3 rounded-lg shadow-sm hover:shadow-md transition duration-300 flex flex-col items-center w-44 h-[240px] ${cardClass}`}
      style={customStyle}
    >
      <div className="mb-2 h-20 w-20 overflow-hidden rounded-full bg-gray-50 border">
        <img
          src={course.img && course.img.trim() !== "" ? course.img : defaultImgUrl}
          alt={course.titre}
          className="object-cover object-center w-full h-full"
          loading="lazy"
        />
      </div>

      <h3 className="text-xs font-semibold mb-1 text-center line-clamp-2">
        {course.titre}
      </h3>

      <div className="mb-2">{badge}</div>

      <button
        onClick={handleMainButton}
        className={`w-full py-1.5 rounded-md text-xs font-semibold transition
          ${buttonColor} 
          shadow hover:shadow-md active:scale-95 cursor-pointer
          hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 mb-1`}
      >
        {buttonLabel}
      </button>

      <Link
        href={`/courses/${course.id}`}
        className="text-xs text-blue-600 hover:underline"
      >
        Détail
      </Link>
    </div>
  );
}

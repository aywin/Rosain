// front/src/components/course/CourseCard.tsx 
"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { freeCourseIds } from "@/utils/freeCourses";
import {
  FaPlay,
  FaCheckCircle,
  FaClock,
  FaLock,
  FaUnlock,
  FaArrowRight
} from "react-icons/fa";

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
    if (freeCourseIds.includes(course.id)) {
      router.push(`/tuto/${course.id}`);
      return;
    }

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!course.enrolled) {
      onEnroll?.();
    } else {
      router.push(`/tuto/${course.id}`);
    }
  };

  const defaultImgUrl =
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600";

  const isFree = freeCourseIds.includes(course.id);

  const colors = {
    green: "#2C5F4D",
    greenLight: "#E8F5E9",
    greenText: "#1e4d3c",
    navy: "#00205B",
    navyLight: "#E3F2FD",
  };

  let config = {
    buttonLabel: isFree ? "Accès libre" : "S'inscrire",
    buttonIcon: isFree ? <FaUnlock /> : <FaLock />,
    buttonBg: isFree ? colors.green : colors.navy,
    buttonHover: isFree ? "#1e4d3c" : "#001A4D",
    badge: isFree
      ? { text: "Gratuit", bg: colors.greenLight, color: colors.greenText, icon: <FaUnlock /> }
      : { text: "Premium", bg: colors.navyLight, color: colors.navy, icon: <FaLock /> },
    cardBg: "bg-white",
    cardBorder: "border-gray-200"
  };

  if (course.enrolled) {
    switch (course.progressStatus) {
      case "not_started":
        config = {
          buttonLabel: "Commencer",
          buttonIcon: <FaPlay />,
          buttonBg: colors.navy,
          buttonHover: "#001A4D",
          badge: { text: "Non commencé", bg: "#FFF3E0", color: "#E65100", icon: <FaClock /> },
          cardBg: "bg-orange-50",
          cardBorder: "border-orange-200"
        };
        break;

      case "in_progress":
        config = {
          buttonLabel: "Continuer",
          buttonIcon: <FaPlay />,
          buttonBg: colors.navy,
          buttonHover: "#001A4D",
          badge: { text: "En cours", bg: colors.navyLight, color: colors.navy, icon: <FaClock /> },
          cardBg: "bg-blue-50",
          cardBorder: "border-blue-200"
        };
        break;

      case "done":
        config = {
          buttonLabel: "Revoir",
          buttonIcon: <FaCheckCircle />,
          buttonBg: colors.green,
          buttonHover: "#1e4d3c",
          badge: { text: "Terminé", bg: colors.greenLight, color: colors.greenText, icon: <FaCheckCircle /> },
          cardBg: "bg-green-50",
          cardBorder: "border-green-200"
        };
        break;
    }
  }

  return (
    <div className={`group ${config.cardBg} border-2 ${config.cardBorder} rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden h-full`}>
      <div className="relative p-5 flex flex-col h-full">
        {/* Badge statut */}
        <div className="absolute top-3 right-3 z-10">
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm backdrop-blur-sm"
            style={{ backgroundColor: config.badge.bg, color: config.badge.color }}
          >
            {config.badge.icon}
            {config.badge.text}
          </span>
        </div>

        {/* Image */}
        <div className="relative mb-4">
          <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shadow-sm group-hover:shadow-md transition-shadow duration-300">
            <img
              src={course.img && course.img.trim() !== "" ? course.img : defaultImgUrl}
              alt={course.titre}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
        </div>

        {/* Titre */}
        <h3 className="text-lg font-bold text-gray-800 mb-4 line-clamp-2 min-h-[3.5rem] leading-tight">
          {course.titre}
        </h3>

        {/* Actions */}
        <div className="mt-auto space-y-2.5">
          {/* Bouton principal */}
          <button
            onClick={handleMainButton}
            className="w-full text-white py-3.5 px-4 rounded-lg font-semibold text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all duration-200"
            style={{
              backgroundColor: config.buttonBg,
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = config.buttonHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = config.buttonBg}
          >
            {config.buttonIcon}
            <span>{config.buttonLabel}</span>
            <FaArrowRight className="ml-auto" />
          </button>

          {/* Lien détails */}
          <Link
            href={`/courses/${course.id}`}
            className="block w-full text-center text-sm font-medium hover:underline transition-colors py-1"
            style={{ color: colors.navy }}
          >
            Voir les détails →
          </Link>
        </div>
      </div>
    </div>
  );
}
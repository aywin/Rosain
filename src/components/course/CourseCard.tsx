"use client";
import { useRouter } from "next/navigation";

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

  const handleClick = () => {
    if (!course.enrolled) {
      onEnroll?.();
    } else {
      router.push(`/courses/${course.id}`);
    }
  };

  const defaultImgUrl =
    "https://myschool-maroc.com/wp-content/uploads/2023/11/medium-shot-boy-portrait-with-graduation-background-768x748.jpg";

  let buttonLabel = "S'inscrire";
  let buttonColor = "bg-gray-500 text-white";
  let badge = (
    <span className="px-2 py-0.5 text-xs rounded bg-gray-200 text-gray-600">
      Nouveau
    </span>
  );

  let cardClass = "bg-white border border-gray-200 text-gray-800";
  let customStyle: React.CSSProperties = {}; // Pour Airbus Blue

  if (course.enrolled) {
    switch (course.progressStatus) {
      case "not_started":
        buttonLabel = "Commencer";
        buttonColor = "bg-white text-pink-800";
        badge = (
          <span className="px-2 py-0.5 text-xs rounded bg-white text-pink-800">
            Non commencé
          </span>
        );
        cardClass = "bg-pink-800 border border-pink-900 text-white";
        break;

      case "in_progress":
        buttonLabel = "Continuer";
        buttonColor = "bg-white text-[#00205B]";
        badge = (
          <span className="px-2 py-0.5 text-xs rounded bg-white text-[#00205B]">
            En cours
          </span>
        );
        customStyle = { backgroundColor: "#00205B", borderColor: "#001A4D", color: "white" };
        break;

      case "done":
        buttonLabel = "Revoir";
        buttonColor = "bg-white text-green-800";
        badge = (
          <span className="px-2 py-0.5 text-xs rounded bg-white text-green-800">
            Terminé
          </span>
        );
        cardClass = "bg-green-800 border border-green-900 text-white";
        break;
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`group cursor-pointer p-4 rounded-xl shadow-sm hover:shadow-md transition duration-300 flex flex-col items-center w-56 h-[250px] ${cardClass}`}
      style={customStyle}
    >
      {/* Image */}
      <div className="mb-3 h-24 w-24 overflow-hidden rounded-full bg-gray-50 border">
        <img
          src={course.img && course.img.trim() !== "" ? course.img : defaultImgUrl}
          alt={course.titre}
          className="object-cover object-center w-full h-full"
          loading="lazy"
        />
      </div>

      {/* Titre */}
      <h3 className="text-sm font-semibold mb-2 text-center line-clamp-2">
        {course.titre}
      </h3>

      {/* Badge */}
      <div className="mb-3">{badge}</div>

      {/* Bouton */}
      <button
        className={`w-full py-2 rounded-lg font-semibold mt-auto ${buttonColor}`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

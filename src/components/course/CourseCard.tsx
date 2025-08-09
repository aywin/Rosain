"use client";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  titre: string;
  description: string;
  niveau: string;   // nom lisible
  matiere: string;  // nom lisible
  img?: string;     // url image optionnelle
}

interface Props {
  course: Course;
}

export default function CourseCard({ course }: Props) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/courses/${course.id}`);
  };


  const defaultImgUrl = "https://myschool-maroc.com/wp-content/uploads/2023/11/medium-shot-boy-portrait-with-graduation-background-768x748.jpg";




  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer p-6 rounded-2xl bg-white border border-[oklch(92%_0.02_350)] shadow-sm hover:shadow-md transition duration-300 w-full flex flex-col"
    >
<div className="mb-4 h-48 w-full overflow-hidden rounded-lg bg-gray-100 border border-gray-200">
  <img
    src={course.img && course.img.trim() !== "" ? course.img : defaultImgUrl}
    alt={course.titre}
    className="object-contain object-center w-full h-full"
    loading="lazy"
  />
</div>



      <h3 className="text-xl font-semibold mb-2 text-[oklch(30%_0.02_250)] group-hover:text-[oklch(40%_0.1_250)] transition">
        {course.titre}
      </h3>

      <p className="text-sm mb-3 text-[oklch(35%_0.02_250)]">
        <span className="font-medium">Niveau :</span> {course.niveau || "Inconnu"} |{" "}
        <span className="font-medium">Matière :</span> {course.matiere || "Inconnue"}
      </p>

      <p className="text-sm text-[oklch(40%_0.02_250)] mb-4 leading-relaxed line-clamp-3">
        {course.description}
      </p>

      <div className="text-sm text-[oklch(60%_0.14_350)] font-semibold underline mt-auto">
        Voir le cours →
      </div>
    </div>
  );
}

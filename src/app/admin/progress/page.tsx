"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import { mapCourseWithNames, Course } from "@/utils/mapCourse";

interface User {
  id: string;
  nom: string;
  prenom: string;
}

interface EnrollmentWithInfo {
  user: User;
  course: Course;
  date_inscription: Date;
  progressStatus: "not_started" | "in_progress" | "done";
}

export default function ProgressPage() {
  const [data, setData] = useState<EnrollmentWithInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const enrollSnap = await getDocs(collection(db, "enrollments"));
        const enrollments = enrollSnap.docs.map((d) => d.data());

        const detailedEnrollments: EnrollmentWithInfo[] = [];

        for (const e of enrollments) {
          // récupérer user
          const userSnap = await getDoc(doc(db, "users", e.id_user));
          if (!userSnap.exists()) continue;
          const userData = userSnap.data();
          const user: User = {
            id: e.id_user,
            nom: userData.nom || "",
            prenom: userData.prenom || "",
          };

          // récupérer course
          const courseSnap = await getDoc(doc(db, "courses", e.id_course));
          if (!courseSnap.exists()) continue;
          const course = await mapCourseWithNames(courseSnap.id, courseSnap.data());

          // récupérer progression si elle existe
          const progressQuery = query(
            collection(db, "progress"),
            where("id_user", "==", e.id_user),
            where("id_course", "==", e.id_course)
          );
          const progressSnap = await getDocs(progressQuery);
          const progressData = progressSnap.empty
            ? { status: "not_started" }
            : progressSnap.docs[0].data();
          const progressStatus: "not_started" | "in_progress" | "done" =
            progressData.status || "not_started";

          detailedEnrollments.push({
            user,
            course,
            date_inscription: e.date_inscription.toDate(),
            progressStatus,
          });
        }

        setData(detailedEnrollments);
        setLoading(false);
      } catch (err) {
        console.error("Erreur récupération progress :", err);
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  if (loading) return <p>Chargement...</p>;
  if (data.length === 0) return <p>Aucune inscription trouvée.</p>;

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-6">Progression des utilisateurs</h1>
      <table className="w-full table-auto border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">Nom</th>
            <th className="border px-4 py-2">Prénom</th>
            <th className="border px-4 py-2">Cours</th>
            <th className="border px-4 py-2">Niveau</th>
            <th className="border px-4 py-2">Matière</th>
            <th className="border px-4 py-2">Date inscription</th>
            <th className="border px-4 py-2">Progression</th>
          </tr>
        </thead>
        <tbody>
          {data.map((e, i) => (
            <tr key={i}>
              <td className="border px-4 py-2">{e.user.nom}</td>
              <td className="border px-4 py-2">{e.user.prenom}</td>
              <td className="border px-4 py-2">{e.course.titre}</td>
              <td className="border px-4 py-2">{e.course.niveau}</td>
              <td className="border px-4 py-2">{e.course.matiere}</td>
              <td className="border px-4 py-2">{e.date_inscription.toLocaleDateString()}</td>
              <td className="border px-4 py-2 capitalize">{e.progressStatus.replace("_", " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

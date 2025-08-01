"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
} from "firebase/firestore";

interface Course {
  id: string;
  titre: string;
  description: string;
  id_niveau: string; // nom du niveau
  id_matiere: string; // nom de la matière
}

interface Video {
  id: string;
  titre: string;
  ordre?: number;
}

export default function CoursePage() {
  const router = useRouter();
  const params = useParams();

  const courseId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id) && params.id.length > 0
      ? params.id[0]
      : undefined;

  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);

  // Charger infos du cours + noms du niveau et de la matière
  useEffect(() => {
    if (!courseId) return;

    const fetchCourse = async () => {
      const courseRef = doc(db, "courses", courseId);
      const courseSnap = await getDoc(courseRef);

      if (!courseSnap.exists()) return;

      const courseData = courseSnap.data();

      const levelSnap = await getDoc(doc(db, "levels", courseData.level_id));
      const levelName = levelSnap.exists() ? levelSnap.data().name : "Niveau inconnu";

      const subjectSnap = await getDoc(doc(db, "subjects", courseData.subject_id));
      const subjectName = subjectSnap.exists() ? subjectSnap.data().name : "Matière inconnue";

      setCourse({
        id: courseSnap.id,
        titre: courseData.title,
        description: courseData.description,
        id_niveau: levelName,
        id_matiere: subjectName,
      });
    };

    fetchCourse();
  }, [courseId]);

  // Charger vidéos
  useEffect(() => {
    if (!courseId) return;

    const fetchVideos = async () => {
      const q = query(collection(db, "videos"), where("courseId", "==", courseId));
      const snap = await getDocs(q);
      const vids = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Video))
        .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

      setVideos(vids);
      setLoading(false);
    };

    fetchVideos();
  }, [courseId]);

  // Vérifie si l'utilisateur est déjà inscrit à ce cours
  useEffect(() => {
    setCheckingEnrollment(true);

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user || !courseId) {
        setEnrolled(false);
        setCheckingEnrollment(false);
        return;
      }

      const q = query(
        collection(db, "enrollments"),
        where("id_user", "==", user.uid),
        where("id_course", "==", courseId)
      );
      const snap = await getDocs(q);
      setEnrolled(!snap.empty);
      setCheckingEnrollment(false);
    });

    return () => unsubscribe();
  }, [courseId]);

  const handleEnroll = async () => {
    const user = auth.currentUser;

    if (!user) {
      router.push("/mycourses");
      return;
    }

    try {
      await addDoc(collection(db, "enrollments"), {
        id_user: user.uid,
        id_course: courseId,
        date_inscription: new Date(),
      });

      setEnrolled(true);
      alert("Inscription au cours réussie !");
    } catch (err) {
      console.error("Erreur pendant l'inscription :", err);
      alert("Une erreur est survenue pendant l'inscription.");
    }
  };

  if (!courseId) return <div>Identifiant du cours manquant.</div>;
  if (!course) return <div>Chargement du cours...</div>;

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
      {/* Bouton Aller à mes cours */}
      <div className="mb-6 flex justify-end">
        <button
          className="bg-blue-500 text-white px-3 py-1 rounded"
          onClick={() => router.push("/mycourses")}
        >
          Aller à mes cours
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-2">{course.titre}</h1>
      <div className="mb-2">
        Niveau : <b>{course.id_niveau}</b> | Matière : <b>{course.id_matiere}</b>
      </div>
      <div className="mb-6">{course.description}</div>

      <h2 className="text-xl font-semibold mb-2 mt-6">Programme du cours</h2>
      {loading ? (
        <div>Chargement des vidéos...</div>
      ) : videos.length === 0 ? (
        <div>Aucune vidéo (chapitre) pour ce cours pour l’instant.</div>
      ) : (
        <ol className="list-decimal pl-6">
          {videos.map((v) => (
            <li key={v.id} className="mb-2">
              {v.titre}
            </li>
          ))}
        </ol>
      )}

      {/* Bouton inscription */}
      <div className="mt-8">
        {checkingEnrollment ? (
          <button disabled className="bg-gray-400 text-white px-4 py-2 rounded">
            Vérification...
          </button>
        ) : enrolled ? (
          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={() => router.push(`/tuto/${courseId}`)}
          >
            Accéder au cours
          </button>
        ) : (
          <button
            className="bg-blue-700 text-white px-4 py-2 rounded"
            onClick={handleEnroll}
          >
            S’enroller à ce cours
          </button>
        )}
      </div>
    </div>
  );
}

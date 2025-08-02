"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { mapCourseWithNames } from "@/utils/mapCourse";

import Sidebar from "@/components/tuto/Sidebar";
import CourseHeader from "@/components/tuto/CourseHeader";
import VideoPlayer from "@/components/tuto/VideoPlayer";
import VideoTranscript from "@/components/tuto/VideoTranscript";
import AssistantPanel from "@/components/AssistantPanel";

interface Video {
  id: string;
  title: string;
  url: string;
  ordre?: number;
}

interface Course {
  id: string;
  titre: string;
  description?: string;
  niveau: string;
  matiere: string;
}

export default function TutoPage() {
  const params = useParams();
  const router = useRouter();

  const courseId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id) && params.id.length > 0
      ? params.id[0]
      : undefined;

  const [showAssistant, setShowAssistant] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user || !courseId) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "enrollments"),
        where("id_user", "==", user.uid),
        where("id_course", "==", courseId)
      );
      const snap = await getDocs(q);
      setAllowed(!snap.empty);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;

    const fetchCourse = async () => {
      const snap = await getDoc(doc(db, "courses", courseId));
      if (snap.exists()) {
        const courseData = await mapCourseWithNames(snap.id, snap.data());
        setCourse(courseData);
      }
    };

    fetchCourse();
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;

    const fetchVideos = async () => {
      const q = query(
        collection(db, "videos"),
        where("courseId", "==", courseId)
      );
      const snap = await getDocs(q);
      const vids = snap.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            url: data.url,
            ordre: data.ordre,
          } as Video;
        })
        .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
      setVideos(vids);
    };

    fetchVideos();
  }, [courseId]);

  if (!courseId) {
    return <div className="p-12 text-red-500">ID de cours manquant dans l’URL.</div>;
  }

  if (loading) return <div className="p-12">Chargement…</div>;

  if (!allowed)
    return (
      <div className="p-12 text-red-500">
        Accès refusé : vous n’êtes pas inscrit à ce cours.
        <button
          className="ml-4 underline text-blue-700"
          onClick={() => router.push("/mycourses")}
        >
          Retour à mes cours
        </button>
      </div>
    );

  if (!course) return <div className="p-12">Cours introuvable.</div>;

  if (videos.length === 0) return <div className="p-12">Aucune vidéo pour ce cours.</div>;

  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      {/* Sidebar (responsive) */}
      <div
        className={`
          ${sidebarOpen ? "block" : "hidden"} 
          fixed top-0 left-0 z-30 h-full w-64 bg-white shadow-lg 
          lg:static lg:block
        `}
      >
        <Sidebar
          videos={videos.map((v) => ({ id: v.id, title: v.title }))}
          current={current}
          setCurrent={(i) => {
            setCurrent(i);
            setSidebarOpen(false);
          }}
        />
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col bg-blue-100 relative overflow-y-auto">
        <CourseHeader
          titre={course.titre}
          niveau={course.niveau}
          matiere={course.matiere}
          description={course.description}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <div className="flex-1 flex flex-col items-stretch px-4 py-4 overflow-y-auto">
          {current !== null && videos[current] ? (
            <>
              <VideoPlayer
                url={videos[current].url}
                title={videos[current].title}
                onAssistantClick={() => setShowAssistant(true)}
              />
              <VideoTranscript />
            </>
          ) : (
            <div className="text-gray-500 mt-12 text-lg">
              Veuillez sélectionner une vidéo dans le menu.
            </div>
          )}
        </div>
      </div>

      {/* Assistant Panel */}
      {showAssistant && (
        <div className="fixed right-0 top-0 w-[350px] max-w-full border-l bg-white h-full flex flex-col shadow-lg z-40">
          <AssistantPanel onClose={() => setShowAssistant(false)} />
        </div>
      )}
    </div>
  );
}

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

export default function TutoPage() {
  const { id } = useParams();
  const router = useRouter();

  const courseId = Array.isArray(id) ? id[0] : id;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  // Vérifier l'inscription de l'utilisateur
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user || !courseId) return setLoading(false);
      const q = query(
        collection(db, "enrollments"),
        where("id_user", "==", user.uid),
        where("id_course", "==", courseId)
      );
      const snap = await getDocs(q);
      setAllowed(!snap.empty);
      setLoading(false);
    });
    return () => unsub();
  }, [courseId]);

  // Charger le cours
  useEffect(() => {
    if (!courseId) return;
    getDoc(doc(db, "courses", courseId)).then(async (snap) => {
      if (snap.exists()) setCourse(await mapCourseWithNames(snap.id, snap.data()));
    });
  }, [courseId]);

  // Charger les vidéos
  useEffect(() => {
    if (!courseId) return;
    const q = query(collection(db, "videos"), where("courseId", "==", courseId));
    getDocs(q).then((snap) => {
      const vids = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Video))
        .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
      setVideos(vids);
    });
  }, [courseId]);

  if (!courseId) return <div className="p-12 text-red-500">ID de cours manquant.</div>;
  if (loading) return <div className="p-12">Chargement…</div>;
  if (!allowed)
    return (
      <div className="p-12 text-red-500">
        Accès refusé : non inscrit.
        <button className="ml-4 underline text-blue-700" onClick={() => router.push("/mycourses")}>
          Retour à mes cours
        </button>
      </div>
    );
  if (!course) return <div className="p-12">Cours introuvable.</div>;
  if (videos.length === 0) return <div className="p-12">Aucune vidéo disponible.</div>;

  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "block" : "hidden"
        } fixed top-0 left-0 z-30 h-full w-64 bg-white shadow-lg lg:static lg:block`}
      >
        <Sidebar
          videos={videos.map(({ id, title }) => ({ id, title }))}
          current={current}
          setCurrent={(i) => {
            setCurrent(i);
            setSidebarOpen(false);
          }}
        />
      </div>

      {/* Overlay pour mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
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

        <div className="flex-1 flex flex-col px-4 py-4">
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
            <div className="text-gray-500 mt-12 text-lg">Veuillez sélectionner une vidéo.</div>
          )}
        </div>
      </div>

      {/* Assistant Panel */}
      {showAssistant && (
        <div className="fixed right-0 top-0 w-[350px] max-w-full border-l bg-white h-full z-40 shadow-lg">
          <AssistantPanel onClose={() => setShowAssistant(false)} />
        </div>
      )}
    </div>
  );
}

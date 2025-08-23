"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { auth, db } from "@/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
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
  order?: number;
}

export default function TutoPage() {
  const { id } = useParams();
  const courseId = Array.isArray(id) ? id[0] : id;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  // Vérifier l'inscription de l'utilisateur au cours
  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      return;
    }
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      try {
        const q = query(
          collection(db, "enrollments"),
          where("id_user", "==", user.uid),
          where("id_course", "==", courseId)
        );
        const snap = await getDocs(q);
        setAllowed(!snap.empty);
      } catch (error) {
        console.error("Erreur lors de la vérification de l'inscription :", error);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [courseId]);

  // Charger le cours avec noms lisibles niveau/matière
  useEffect(() => {
    if (!courseId) return;
    getDoc(doc(db, "courses", courseId))
      .then(async (snap) => {
        if (snap.exists()) {
          const mappedCourse = await mapCourseWithNames(snap.id, snap.data());
          setCourse(mappedCourse);
        } else {
          setCourse(null);
        }
      })
      .catch((error) => {
        console.error("Erreur chargement cours :", error);
        setCourse(null);
      });
  }, [courseId]);

  // Charger les vidéos triées par ordre
  useEffect(() => {
    if (!courseId) return;
    const q = query(collection(db, "videos"), where("courseId", "==", courseId));
    getDocs(q)
      .then((snap) => {
        const vids = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Video))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setVideos(vids);
        if (vids.length > 0) setCurrent(0);

        // Vérifier si le progress existe pour la première vidéo
        auth.onAuthStateChanged(async (user) => {
          if (user && vids.length > 0) {
            await updateProgress(user.uid, courseId!, vids[0].order ?? 0, vids);
          }
        });
      })
      .catch((error) => {
        console.error("Erreur chargement vidéos :", error);
        setVideos([]);
      });
  }, [courseId]);

  // Fonction pour mettre à jour la progression
  const updateProgress = async (
    userId: string,
    courseId: string,
    videoOrder: number,
    allVideos: Video[]
  ) => {
    const orders = allVideos.map((v) => v.order ?? 0);
    const firstOrder = Math.min(...orders);
    const lastOrder = Math.max(...orders);

    let status: "not_started" | "in_progress" | "done" = "in_progress";
    if (videoOrder === firstOrder) status = "in_progress";
    if (videoOrder === lastOrder) status = "done";

    await setDoc(
      doc(db, "progress", `${userId}_${courseId}`),
      {
        id_user: userId,
        id_course: courseId,
        status,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  };

  if (!courseId)
    return <div className="p-12 text-red-500">ID de cours manquant.</div>;
  if (loading) return <div className="p-12">Chargement…</div>;
  if (!allowed)
    return (
      <div className="p-12 text-red-500">
        Accès refusé : non inscrit.
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
            // Update progress on video select
            if (auth.currentUser) {
              updateProgress(auth.currentUser.uid, courseId!, videos[i].order ?? 0, videos);
            }
          }}
        />
      </div>

      {/* Overlay pour mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col bg-blue-100 relative overflow-y-auto">
        <CourseHeader
          titre={course.titre}
          niveau={course.niveau}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <div className="flex-1 flex flex-col px-4 py-4">
          {current !== null && videos[current] ? (
            <>
              <VideoPlayer
                url={videos[current].url}
                title={videos[current].title}
                onAssistantClick={() => setShowAssistant(true)}
                onNext={() => {
                  if (current !== null && current + 1 < videos.length) {
                    setCurrent(current + 1);
                    // Update progress sur vidéo suivante
                    if (auth.currentUser) {
                      updateProgress(auth.currentUser.uid, courseId!, videos[current + 1].order ?? 0, videos);
                    }
                  }
                }}
              />
              <VideoTranscript />
            </>
          ) : (
            <div className="text-gray-500 mt-12 text-lg">
              Veuillez sélectionner une vidéo.
            </div>
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

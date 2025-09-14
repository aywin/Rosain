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
  quizzes?: any[];
}

export default function TutoPage() {
  // Gestion robuste des paramètres de la route
  const params = useParams();
  const courseId = params?.id
    ? Array.isArray(params.id)
      ? params.id[0]
      : params.id
    : null;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [current, setCurrent] = useState<number | null>(0);
  const [videos, setVideos] = useState<Video[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  if (!courseId) return <div className="p-12 text-red-500">ID manquant</div>;

  // Vérifier l'inscription
  useEffect(() => {
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
        console.error(error);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [courseId]);

  // Charger le cours
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
        console.error(error);
        setCourse(null);
      });
  }, [courseId]);

  // Charger les vidéos et leurs quiz
  useEffect(() => {
    if (!courseId) return;
    const loadVideosAndQuizzes = async () => {
      try {
        const videoQuery = query(
          collection(db, "videos"),
          where("courseId", "==", courseId)
        );
        const videoSnap = await getDocs(videoQuery);

        const vids: Video[] = await Promise.all(
          videoSnap.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const quizQuery = query(
              collection(db, "quizzes"),
              where("videoId", "==", docSnap.id)
            );
            const quizSnap = await getDocs(quizQuery);
            const quizzes = quizSnap.docs.map((q) => ({
              id: q.id,
              ...q.data(),
            }));

            return {
              id: docSnap.id,
              title: data.title,
              url: data.url,
              order: data.order ?? 0,
              quizzes,
            } as Video;
          })
        );

        vids.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setVideos(vids);
        if (vids.length > 0) setCurrent(0);
      } catch (error) {
        console.error(error);
        setVideos([]);
      }
    };
    loadVideosAndQuizzes();
  }, [courseId]);

  // Mettre à jour la progression
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

  if (loading) return <div className="p-12">Chargement…</div>;
  if (!allowed) return <div className="p-12 text-red-500">Accès refusé</div>;
  if (!course) return <div className="p-12">Cours introuvable</div>;
  if (videos.length === 0) return <div className="p-12">Aucune vidéo</div>;

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
            if (auth.currentUser) {
              updateProgress(
                auth.currentUser.uid,
                courseId,
                videos[i].order ?? 0,
                videos
              );
            }
          }}
        />
      </div>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenu */}
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
                courseId={courseId}
                videoIdFirestore={videos[current].id}
                onAssistantClick={() => setShowAssistant(true)}
                onNext={() => {
                  if (current !== null && current + 1 < videos.length) {
                    setCurrent(current + 1);
                    if (auth.currentUser) {
                      updateProgress(
                        auth.currentUser.uid,
                        courseId,
                        videos[current + 1].order ?? 0,
                        videos
                      );
                    }
                  }
                }}
                quizzes={videos[current].quizzes}
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

      {/* Assistant */}
      {showAssistant && (
        <div className="fixed right-0 top-0 w-[350px] max-w-full border-l bg-white h-full z-40 shadow-lg">
          <AssistantPanel onClose={() => setShowAssistant(false)} />
        </div>
      )}
    </div>
  );
}

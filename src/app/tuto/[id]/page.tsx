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
import ExoPlayer from "@/components/tuto/ExoPlayer";

interface Video {
  id: string;
  title: string;
  url: string;
  order?: number;
  quizzes?: any[];
}

interface AppExo {
  id: string;
  title: string;
  videoAfter: string;
}

type ContentItem =
  | ({ type: "video" } & Video)
  | ({ type: "exo" } & AppExo);

export default function TutoPage() {
  const params = useParams<{ id: string }>();
  if (!params?.id) return <div className="p-12 text-red-500">ID manquant</div>;
  const courseId = params.id;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [current, setCurrent] = useState<number | null>(0);
  const [videos, setVideos] = useState<Video[]>([]);
  const [appExos, setAppExos] = useState<AppExo[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  // Vérifier inscription
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

  // Charger vidéos + exos
  useEffect(() => {
    const loadContent = async () => {
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

        const exoQuery = query(
          collection(db, "app_exercises"),
          where("courseId", "==", courseId)
        );
        const exoSnap = await getDocs(exoQuery);
        const exos: AppExo[] = exoSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setAppExos(exos);

        const merged: ContentItem[] = [];
        vids.forEach((video) => {
          merged.push({ type: "video", ...video });
          const afterExos = exos.filter((e) => e.videoAfter === video.id);
          afterExos.forEach((exo) => merged.push({ type: "exo", ...exo }));
        });

        setContent(merged);
        if (merged.length > 0) setCurrent(0);
      } catch (error) {
        console.error(error);
        setVideos([]);
        setAppExos([]);
        setContent([]);
      }
    };
    loadContent();
  }, [courseId]);

  // progression
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
  if (content.length === 0) return <div className="p-12">Aucun contenu</div>;

  const currentItem = current !== null ? content[current] : null;

  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "block" : "hidden"
        } fixed top-0 left-0 z-30 h-full w-64 bg-white shadow-lg lg:static lg:block`}
      >
        <Sidebar
          content={content.map(({ id, title, type }) => ({ id, title, type }))}
          current={current}
          setCurrent={(i) => {
            setCurrent(i);
            setSidebarOpen(false);

            const item = content[i];
            if (auth.currentUser && item.type === "video") {
              updateProgress(
                auth.currentUser.uid,
                courseId,
                (item as Video).order ?? 0,
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

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col bg-blue-100 relative overflow-y-auto">
        <CourseHeader
          titre={course.titre}
          niveau={course.niveau}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <div className="flex-1 flex flex-col px-4 py-4">
          {currentItem ? (
            currentItem.type === "video" ? (
              <>
                <VideoPlayer
                  url={currentItem.url}
                  title={currentItem.title}
                  courseId={courseId}
                  videoIdFirestore={currentItem.id}
                  onAssistantClick={() => setShowAssistant(true)}
                  onNext={() => {
                    if (current !== null && current + 1 < content.length) {
                      setCurrent(current + 1);
                      const next = content[current + 1];
                      if (auth.currentUser && next.type === "video") {
                        updateProgress(
                          auth.currentUser.uid,
                          courseId,
                          (next as Video).order ?? 0,
                          videos
                        );
                      }
                    }
                  }}
                  quizzes={(currentItem as Video).quizzes}
                />
                <VideoTranscript />
              </>
            ) : (
              <ExoPlayer
                exoId={currentItem.id}
                onNext={() => {
                  if (current !== null && current + 1 < content.length) {
                    setCurrent(current + 1);
                    const next = content[current + 1];
                    if (auth.currentUser && next.type === "video") {
                      updateProgress(
                        auth.currentUser.uid,
                        courseId,
                        (next as Video).order ?? 0,
                        videos
                      );
                    }
                  }
                }}
              />
            )
          ) : (
            <div className="text-gray-500 mt-12 text-lg">
              Veuillez sélectionner un élément.
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

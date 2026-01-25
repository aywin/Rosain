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
import { mapCourseWithNamesAuto } from "@/utils/mapCourse";
import { freeCourseIds } from "@/utils/freeCourses";

import Sidebar from "@/components/tuto/Sidebar";
import CourseHeader from "@/components/tuto/CourseHeader";
import VideoPlayer from "@/components/tuto/VideoPlayer";
import AssistantPanel from "@/components/AssistantPanel";
import ExoPlayer from "@/components/tuto/ExoPlayer";

interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

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
  if (!params?.id)
    return <div className="p-12 text-red-600">ID manquant</div>;
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

  const [transcripts, setTranscripts] = useState<Record<string, TranscriptSegment[]>>({});
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);

  // ⚡ Vérification d'accès
  useEffect(() => {
    if (freeCourseIds.includes(courseId)) {
      setAllowed(true);
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
        console.error(error);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [courseId]);

  // ⚡ Charger le cours (optimisé avec cache)
  useEffect(() => {
    getDoc(doc(db, "courses", courseId))
      .then(async (snap) => {
        if (snap.exists()) {
          const mappedCourse = await mapCourseWithNamesAuto(snap.id, snap.data());
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

  // ⚡ Charger vidéos + exos + transcriptions + quizzes (optimisé)
  useEffect(() => {
    const loadContent = async () => {
      try {
        // ⚡ Charger vidéos, exos, quizzes et transcripts en parallèle
        const [videoSnap, exoSnap, quizSnap, transcriptSnap] = await Promise.all([
          getDocs(query(collection(db, "videos"), where("courseId", "==", courseId))),
          getDocs(query(collection(db, "app_exercises"), where("courseId", "==", courseId))),
          getDocs(collection(db, "quizzes")),
          getDocs(collection(db, "transcripts"))
        ]);

        // ⚡ Créer des maps pour lookup rapide
        const quizzesMap = new Map<string, any[]>();
        quizSnap.docs.forEach(doc => {
          const data = doc.data();
          const videoId = data.videoId;
          if (!quizzesMap.has(videoId)) {
            quizzesMap.set(videoId, []);
          }
          quizzesMap.get(videoId)!.push({ id: doc.id, ...data });
        });

        const transcriptsMap = new Map<string, TranscriptSegment[]>();
        transcriptSnap.docs.forEach(doc => {
          const data = doc.data();
          transcriptsMap.set(doc.id, data.segments || []);
        });

        // ⚡ Mapper les vidéos avec leurs quizzes et transcripts
        const vids: Video[] = videoSnap.docs.map(docSnap => {
          const data = docSnap.data();
          const videoId = docSnap.id;

          // Récupérer quizzes de cette vidéo
          const quizzes = quizzesMap.get(videoId) || [];

          // Récupérer transcript de cette vidéo
          const transcript = transcriptsMap.get(videoId);
          if (transcript) {
            setTranscripts(prev => ({ ...prev, [videoId]: transcript }));
          }

          return {
            id: videoId,
            title: data.title,
            url: data.url,
            order: data.order ?? 0,
            quizzes,
          };
        });

        vids.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setVideos(vids);

        // ⚡ Mapper les exercices
        const exos: AppExo[] = exoSnap.docs.map(d => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setAppExos(exos);

        // ⚡ Fusionner vidéos et exos
        const merged: ContentItem[] = [];
        vids.forEach(video => {
          merged.push({ type: "video", ...video });
          const afterExos = exos.filter(e => e.videoAfter === video.id);
          afterExos.forEach(exo => merged.push({ type: "exo", ...exo }));
        });

        setContent(merged);
        if (merged.length > 0) setCurrent(0);
      } catch (error) {
        console.error("Erreur chargement contenu:", error);
        setVideos([]);
        setAppExos([]);
        setContent([]);
      }
    };
    loadContent();
  }, [courseId]);

  // Progression
  const updateProgress = async (
    userId: string,
    courseId: string,
    videoOrder: number,
    allVideos: Video[]
  ) => {
    const orders = allVideos.map(v => v.order ?? 0);
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

  if (loading)
    return (
      <div className="p-12 text-blue-600 font-semibold text-lg">
        Chargement…
      </div>
    );
  if (!allowed)
    return (
      <div className="p-12 text-red-600 font-semibold text-lg">
        Accès refusé
      </div>
    );
  if (!course)
    return (
      <div className="p-12 text-orange-600 font-semibold text-lg">
        Cours introuvable
      </div>
    );
  if (content.length === 0)
    return (
      <div className="p-12 text-red-600 font-semibold text-lg">
        Aucun contenu
      </div>
    );

  const currentItem = current !== null ? content[current] : null;

  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      {/* Sidebar */}
      <Sidebar
        content={content.map(({ id, title, type }) => ({
          id,
          title,
          type,
        }))}
        current={current}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
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

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col bg-gray-50 relative overflow-y-auto">
        <CourseHeader
          titre={course.titre}
          niveau={course.niveau}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
        />

        <div className="flex-1 flex flex-col px-4 py-4">
          {currentItem ? (
            currentItem.type === "video" ? (
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
                transcript={transcripts[currentItem.id] || []}
                onTimeUpdate={setVideoCurrentTime}
              />
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
            <div className="text-gray-800 mt-12 text-lg">
              Veuillez sélectionner un élément.
            </div>
          )}
        </div>
      </div>

      {/* Assistant */}
      {showAssistant && (
        <div className="fixed right-0 top-0 h-screen z-50 shadow-2xl">
          <AssistantPanel
            onClose={() => setShowAssistant(false)}
            courseContext={
              currentItem && course
                ? {
                  courseTitle: course.titre,
                  courseLevel: course.niveau,
                  currentVideoTitle: currentItem.title,
                  currentVideoUrl:
                    currentItem.type === "video"
                      ? (currentItem as Video).url
                      : "",
                  currentTime: videoCurrentTime,
                  transcript:
                    currentItem.type === "video"
                      ? transcripts[currentItem.id] || []
                      : [],
                }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
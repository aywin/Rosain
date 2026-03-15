"use client";

import { useEffect, useState, useCallback } from "react";
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

// ⚡ Seuil de complétion : 90% de la vidéo regardée
const COMPLETION_THRESHOLD = 0.9;

export default function TutoPage() {
  const params = useParams<{ id: string }>();
  if (!params?.id) return <div className="p-12 text-red-600">ID manquant</div>;
  const courseId = params.id;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [current, setCurrent] = useState<number | null>(0);
  const [videos, setVideos] = useState<Video[]>([]);
  const [exoIds, setExoIds] = useState<string[]>([]);
  // ⚡ IDs stables pour les dépendances useEffect — évite les re-renders sur référence array
  const [videoIds, setVideoIds] = useState<string[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [transcripts, setTranscripts] = useState<Record<string, TranscriptSegment[]>>({});
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [resumePositions, setResumePositions] = useState<Record<string, number>>({});
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  // ⚡ userId résolu via onAuthStateChanged — jamais null au mauvais moment
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid ?? null);
    });
    return () => unsub();
  }, []);

  const markCompleted = useCallback((itemId: string) => {
    setCompletedIds((prev) => {
      if (prev.has(itemId)) return prev;
      return new Set([...prev, itemId]);
    });
  }, []);

  // ── Accès ──
  useEffect(() => {
    if (freeCourseIds.includes(courseId)) {
      setAllowed(true);
      setLoading(false);
      return;
    }
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { setAllowed(false); setLoading(false); return; }
      try {
        const snap = await getDocs(query(
          collection(db, "enrollments"),
          where("id_user", "==", user.uid),
          where("id_course", "==", courseId)
        ));
        setAllowed(!snap.empty);
      } catch { setAllowed(false); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, [courseId]);

  // ── Cours ──
  useEffect(() => {
    getDoc(doc(db, "courses", courseId))
      .then(async (snap) => {
        if (snap.exists()) setCourse(await mapCourseWithNamesAuto(snap.id, snap.data()));
        else setCourse(null);
      })
      .catch(() => setCourse(null));
  }, [courseId]);

  // ── Contenu ──
  useEffect(() => {
    const loadContent = async () => {
      try {
        const [videoSnap, exoSnap] = await Promise.all([
          getDocs(query(collection(db, "videos"), where("courseId", "==", courseId))),
          getDocs(query(collection(db, "app_exercises"), where("courseId", "==", courseId))),
        ]);

        const localVideoIds = videoSnap.docs.map((d) => d.id);
        const loadedExoIds = exoSnap.docs.map((d) => d.id);
        const quizzesMap = new Map<string, any[]>();
        const newTranscripts: Record<string, TranscriptSegment[]> = {};
        const batchSize = 30;

        if (localVideoIds.length > 0) {
          const [quizResults, transcriptResults] = await Promise.all([
            Promise.all(
              Array.from({ length: Math.ceil(localVideoIds.length / batchSize) }, (_, i) =>
                getDocs(query(collection(db, "quizzes"), where("videoId", "in", localVideoIds.slice(i * batchSize, (i + 1) * batchSize))))
              )
            ),
            Promise.all(
              Array.from({ length: Math.ceil(localVideoIds.length / batchSize) }, (_, i) =>
                getDocs(query(collection(db, "transcripts"), where("__name__", "in", localVideoIds.slice(i * batchSize, (i + 1) * batchSize))))
              )
            ),
          ]);

          quizResults.forEach((snap) =>
            snap.docs.forEach((d: any) => {
              const vid = d.data().videoId;
              if (!quizzesMap.has(vid)) quizzesMap.set(vid, []);
              quizzesMap.get(vid)!.push({ id: d.id, ...d.data() });
            })
          );
          transcriptResults.forEach((snap) =>
            snap.docs.forEach((d: any) => { newTranscripts[d.id] = d.data().segments || []; })
          );
          if (Object.keys(newTranscripts).length > 0) setTranscripts(newTranscripts);
        }

        const vids: Video[] = videoSnap.docs
          .map((d) => ({
            id: d.id,
            title: d.data().title,
            url: d.data().url,
            order: d.data().order ?? 0,
            quizzes: quizzesMap.get(d.id) || [],
          }))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        setVideos(vids);
        setVideoIds(vids.map((v) => v.id));
        setExoIds(loadedExoIds);

        const exos: AppExo[] = exoSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        const merged: ContentItem[] = [];
        vids.forEach((video) => {
          merged.push({ type: "video", ...video });
          exos.filter((e) => e.videoAfter === video.id)
            .forEach((exo) => merged.push({ type: "exo", ...exo }));
        });

        setContent(merged);
        if (merged.length > 0) setCurrent(0);
      } catch (error) {
        console.error("Erreur chargement contenu:", error);
        setContent([]);
      }
    };
    loadContent();
  }, [courseId]);

  // ── Progressions — se déclenche quand userId ET IDs sont prêts ──
  // ⚡ Dépendances sur videoIds/exoIds (strings) pas sur videos (array d'objets)
  //    pour éviter les re-renders infinis sur changement de référence
  useEffect(() => {
    if (!userId) return;
    if (videoIds.length === 0 && exoIds.length === 0) return;

    const loadProgress = async () => {
      const batchSize = 30;
      const alreadyCompleted = new Set<string>();
      const positions: Record<string, number> = {};

      // Vidéos
      if (videoIds.length > 0) {
        const progressIds = videoIds.map((vid) => `${userId}_${vid}`);
        const results = await Promise.all(
          Array.from({ length: Math.ceil(progressIds.length / batchSize) }, (_, i) =>
            getDocs(query(
              collection(db, "videoProgress"),
              where("__name__", "in", progressIds.slice(i * batchSize, (i + 1) * batchSize))
            ))
          )
        );

        results.forEach((snap) =>
          snap.docs.forEach((d: any) => {
            const data = d.data();
            if (!data.videoId) return;

            if (data.lastPosition) positions[data.videoId] = data.lastPosition;

            // ⚡ Complétion : completed===true OU lastPosition >= 90% de la durée totale
            // On calcule : minutesWatched / (minutesWatched + minutesRemaining) >= 0.9
            const total = (data.minutesWatched ?? 0) + (data.minutesRemaining ?? 0);
            const watchedRatio = total > 0 ? (data.minutesWatched ?? 0) / total : 0;
            if (data.completed === true || watchedRatio >= COMPLETION_THRESHOLD) {
              alreadyCompleted.add(data.videoId);
            }
          })
        );
      }

      // Exos
      if (exoIds.length > 0) {
        const progressIds = exoIds.map((id) => `${userId}_${id}`);
        const results = await Promise.all(
          Array.from({ length: Math.ceil(progressIds.length / batchSize) }, (_, i) =>
            getDocs(query(
              collection(db, "exerciseProgress"),
              where("__name__", "in", progressIds.slice(i * batchSize, (i + 1) * batchSize))
            ))
          )
        );
        results.forEach((snap) =>
          snap.docs.forEach((d: any) => {
            if (d.data().exoId) alreadyCompleted.add(d.data().exoId);
          })
        );
      }

      setResumePositions(positions);
      if (alreadyCompleted.size > 0) setCompletedIds(alreadyCompleted);
    };

    loadProgress();
  }, [userId, videoIds.join(","), exoIds.join(",")]);
  // .join(",") sérialise les arrays en string stable — React compare par valeur

  // ── Statut cours ──
  const updateCourseProgress = async (uid: string, status: "not_started" | "in_progress" | "done") => {
    await setDoc(
      doc(db, "progress", `${uid}_${courseId}`),
      { id_user: uid, id_course: courseId, status, updatedAt: new Date() },
      { merge: true }
    );
  };

  // ── Vidéo terminée (onVideoEnded ou 90% atteint) ──
  const handleVideoCompleted = useCallback(
    (videoId: string) => {
      if (!userId) return;
      setCompletedIds((prev) => {
        if (prev.has(videoId)) return prev;
        const next = new Set([...prev, videoId]);
        const allVideosDone = videoIds.every((id) => next.has(id));
        updateCourseProgress(userId, allVideosDone ? "done" : "in_progress");
        return next;
      });
    },
    [userId, videoIds, courseId]
  );

  // ── Exo soumis ──
  const handleExoSubmitted = useCallback(
    (exoId: string) => markCompleted(exoId),
    [markCompleted]
  );

  if (loading) return <div className="p-12 text-blue-600 font-semibold text-lg">Chargement…</div>;
  if (!allowed) return <div className="p-12 text-red-600 font-semibold text-lg">Accès refusé</div>;
  if (!course) return <div className="p-12 text-orange-600 font-semibold text-lg">Cours introuvable</div>;
  if (content.length === 0) return <div className="p-12 text-red-600 font-semibold text-lg">Aucun contenu</div>;

  const currentItem = current !== null ? content[current] : null;

  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      <Sidebar
        content={content.map(({ id, title, type }) => ({ id, title, type }))}
        current={current}
        completedIds={completedIds}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        setCurrent={(i) => {
          setCurrent(i);
          setSidebarOpen(false);
          if (userId) updateCourseProgress(userId, "in_progress");
        }}
      />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col bg-gray-50 relative overflow-y-auto">
        <CourseHeader
          titre={course.titre}
          niveau={course.niveau}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
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
                  if (current !== null && current + 1 < content.length)
                    setCurrent(current + 1);
                }}
                // ⚡ Les deux chemins de complétion appellent le même handler
                onVideoEnded={() => handleVideoCompleted(currentItem.id)}
                onNinetyPercent={() => handleVideoCompleted(currentItem.id)}
                quizzes={(currentItem as Video).quizzes}
                transcript={transcripts[currentItem.id] || []}
                onTimeUpdate={setVideoCurrentTime}
                initialPosition={resumePositions[currentItem.id] ?? 0}
                subject={course.matiere}
              />
            ) : (
              <ExoPlayer
                exoId={currentItem.id}
                courseId={courseId}
                onNext={() => {
                  if (current !== null && current + 1 < content.length)
                    setCurrent(current + 1);
                }}
                onSubmitted={() => handleExoSubmitted(currentItem.id)}
              />
            )
          ) : (
            <div className="text-gray-800 mt-12 text-lg">Veuillez sélectionner un élément.</div>
          )}
        </div>
      </div>

      {showAssistant && (
        <div className="fixed right-0 top-0 h-screen z-50 shadow-2xl">
          <AssistantPanel
            onClose={() => setShowAssistant(false)}
            courseContext={
              currentItem && course
                ? {
                  courseTitle: course.titre,
                  courseLevel: course.niveau,
                  subject: course.matiere,
                  currentVideoTitle: currentItem.title,
                  currentVideoUrl: currentItem.type === "video" ? (currentItem as Video).url : "",
                  currentTime: videoCurrentTime,
                  transcript: currentItem.type === "video" ? transcripts[currentItem.id] || [] : [],
                }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
// app/mark/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  QuizResponse,
  VideoProgress,
  CourseProgress,
  Enrollment,
  getVideoStats,
  getQuizStats,
} from "@/utils/progress";
import CourseStats from "@/components/mark/CourseStats";
import VideoStats from "@/components/mark/VideoStats";
import QuizStats from "@/components/mark/QuizStats";

export default function MarkPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [quizResponses, setQuizResponses] = useState<QuizResponse[]>([]);
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([]);
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [courses, setCourses] = useState<Record<string, string>>({});
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUserId(u.uid);
      } else {
        setUserId(null);
        setError("Vous devez être connecté pour voir vos activités.");
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // load titles (courses, videos)
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const courseSnap = await getDocs(collection(db, "courses"));
        const courseTitles = Object.fromEntries(
          courseSnap.docs.map((d) => [d.id, (d.data() as any).title])
        );
        setCourses(courseTitles);

        const videoSnap = await getDocs(collection(db, "videos"));
        const videoTitles = Object.fromEntries(
          videoSnap.docs.map((d) => [d.id, (d.data() as any).title])
        );
        setVideos(videoTitles);
      } catch (err) {
        console.error("Erreur metadata:", err);
      }
    };
    loadMetadata();
  }, []);

  // load activities (enrollments, quizzes, videoProgress, progress)
  useEffect(() => {
    if (!userId) return;

    const loadActivities = async () => {
      try {
        setLoading(true);
        setError(null);

        // enrollments
        const enrollmentQuery = query(collection(db, "enrollments"), where("id_user", "==", userId));
        const enrollmentSnap = await getDocs(enrollmentQuery);
        const enrollmentsData: Enrollment[] = enrollmentSnap.docs
          .map((doc) => ({ id: doc.id, ...(doc.data() as any) } as Enrollment))
          .sort((a, b) => {
            const timeA = a.date_inscription?.toDate().getTime() || 0;
            const timeB = b.date_inscription?.toDate().getTime() || 0;
            return timeB - timeA;
          });

        // deduplicate by id_course keeping latest
        const uniqueEnrollments = Object.values(
          enrollmentsData.reduce((acc, enrollment) => {
            const existing = acc[enrollment.id_course as string];
            if (
              !existing ||
              (enrollment.date_inscription?.toDate().getTime() || 0) >
                (existing.date_inscription?.toDate().getTime() || 0)
            ) {
              acc[enrollment.id_course as string] = enrollment;
            }
            return acc;
          }, {} as Record<string, Enrollment>)
        );
        setEnrollments(uniqueEnrollments);

        // quizResponses
        const quizQuery = query(collection(db, "quizResponses"), where("userId", "==", userId));
        const quizSnap = await getDocs(quizQuery);
        const quizzes: QuizResponse[] = quizSnap.docs
          .map((doc) => ({ id: doc.id, ...(doc.data() as any) } as QuizResponse))
          .sort((a, b) => {
            const timeA = a.submittedAt?.toDate().getTime() || 0;
            const timeB = b.submittedAt?.toDate().getTime() || 0;
            return timeB - timeA;
          });
        setQuizResponses(quizzes);

        // videoProgress
        const videoQ = query(collection(db, "videoProgress"), where("userId", "==", userId));
        const videoSnap = await getDocs(videoQ);
        const vids: VideoProgress[] = videoSnap.docs
          .map((doc) => ({ id: doc.id, ...(doc.data() as any) } as VideoProgress))
          .sort((a, b) => {
            const timeA = a.updatedAt?.toDate().getTime() || 0;
            const timeB = b.updatedAt?.toDate().getTime() || 0;
            return timeB - timeA;
          });
        setVideoProgress(vids);

        // course progress
        const courseQ = query(collection(db, "progress"), where("id_user", "==", userId));
        const courseSnap = await getDocs(courseQ);
        const coursesProg: CourseProgress[] = courseSnap.docs
          .map((doc) => ({ id: doc.id, ...(doc.data() as any) } as CourseProgress))
          .sort((a, b) => {
            const timeA = a.updatedAt?.toDate().getTime() || 0;
            const timeB = b.updatedAt?.toDate().getTime() || 0;
            return timeB - timeA;
          });
        setCourseProgress(coursesProg);
      } catch (err: any) {
        console.error("Erreur lors du chargement des activités:", err);
        setError("Erreur lors du chargement des activités.");
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [userId]);

  const toggleSection = (courseId: string) =>
    setOpenSections((prev) => ({ ...prev, [courseId]: !prev[courseId] }));

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-2xl font-semibold text-gray-600 animate-pulse">
          Chargement des activités...
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-2xl text-red-500">{error}</div>
      </div>
    );

  if (!userId)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-2xl text-red-500">Connexion requise.</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 p-6">
      <h1 className="mb-8 text-center text-4xl font-bold text-gray-800">Mes Activités</h1>

      {enrollments.length === 0 ? (
        <div className="rounded-lg bg-white p-6 text-center shadow-lg">
          <p className="text-lg text-gray-500">Aucun cours inscrit.</p>
        </div>
      ) : (
        enrollments.map((enrollment) => {
          const courseId = enrollment.id_course as string;
          const courseTitle = courses[courseId] || courseId;

          const courseQuizResponses = quizResponses.filter((q) => q.courseId === courseId);
          const courseVideoProgress = videoProgress.filter((v) => v.courseId === courseId);
          const courseStatus = courseProgress.find((p) => p.id_course === courseId);
          const isOpen = !!openSections[courseId];

          // calculs via utilitaires
          const vStats = getVideoStats(courseVideoProgress);
          const qStats = getQuizStats(courseQuizResponses);

          return (
            <div key={enrollment.id} className="mb-6 rounded-lg bg-white p-6 shadow-lg">
              <CourseStats
                enrollment={enrollment}
                courseTitle={courseTitle}
                videoPercent={vStats.percent}
                quizAvg={qStats.avgScore}
                courseStatus={courseStatus}
                isOpen={isOpen}
                onToggle={() => toggleSection(courseId)}
              />

              {isOpen && (
                <div className="mt-6 space-y-8">
                  <VideoStats videos={courseVideoProgress} videoTitles={videos} videoStats={vStats} />
                  <QuizStats quizzes={courseQuizResponses} videoTitles={videos} quizStats={{
                    totalQuizzes: qStats.totalQuizzes,
                    avgScore: qStats.avgScore,
                    totalCorrectAnswers: qStats.totalCorrectAnswers,
                    totalMissedAnswers: qStats.totalMissedAnswers,
                  }} />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

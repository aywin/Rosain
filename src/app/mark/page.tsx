"use client";

import React, { useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
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

// Interfaces pour un typage précis
interface CourseData {
  id: string;
  title: string;
}

interface VideoData {
  id: string;
  title: string;
}

// Interface pour le retour de getQuizStats
interface QuizStatsType {
  first: {
    totalQuizzes: number;
    avgScore: number;
    totalCorrectAnswers: number;
    totalAnswers: number;
    totalMissedAnswers: number;
  };
  last: {
    totalQuizzes: number;
    avgScore: number;
    totalCorrectAnswers: number;
    totalAnswers: number;
    totalMissedAnswers: number;
  };
  improvement: {
    avgScore: number;
    totalCorrectAnswers: number;
    totalMissedAnswers: number;
  };
}

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

  // Vérification de l'authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
      else {
        setUserId(null);
        setError("Vous devez être connecté pour voir vos activités.");
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Chargement des données (métadonnées et activités)
  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Métadonnées
        const [courseSnap, videoSnap] = await Promise.all([
          getDocs(collection(db, "courses")),
          getDocs(collection(db, "videos")),
        ]);
        const courseTitles = Object.fromEntries(
          courseSnap.docs.map((doc) => [doc.id, (doc.data() as CourseData).title])
        );
        const videoTitles = Object.fromEntries(
          videoSnap.docs.map((doc) => [doc.id, (doc.data() as VideoData).title])
        );
        setCourses(courseTitles);
        setVideos(videoTitles);

        // Activités
        const [enrollmentSnap, quizSnap, videoSnapProgress, courseSnapProgress] = await Promise.all([
          getDocs(query(collection(db, "enrollments"), where("id_user", "==", userId))),
          getDocs(query(collection(db, "quizResponses"), where("userId", "==", userId))),
          getDocs(query(collection(db, "videoProgress"), where("userId", "==", userId))),
          getDocs(query(collection(db, "progress"), where("id_user", "==", userId))),
        ]);

        // Inscriptions uniques par cours
        const enrollmentsData: Enrollment[] = enrollmentSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Enrollment))
          .sort((a, b) => ((b.date_inscription?.toDate()?.getTime() || 0) - (a.date_inscription?.toDate()?.getTime() || 0)));
        const uniqueEnrollments = Array.from(new Map(enrollmentsData.map((e) => [e.id_course, e])).values());
        setEnrollments(uniqueEnrollments);

        // QuizResponses
        const quizzes: QuizResponse[] = quizSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as QuizResponse))
          .sort((a, b) => ((b.submittedAt?.toDate()?.getTime() || 0) - (a.submittedAt?.toDate()?.getTime() || 0)));
        setQuizResponses(quizzes);

        // VideoProgress
        const vids: VideoProgress[] = videoSnapProgress.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as VideoProgress))
          .sort((a, b) => ((b.updatedAt?.toDate()?.getTime() || 0) - (a.updatedAt?.toDate()?.getTime() || 0)));
        setVideoProgress(vids);

        // CourseProgress
        const coursesProg: CourseProgress[] = courseSnapProgress.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as CourseProgress))
          .sort((a, b) => ((b.updatedAt?.toDate()?.getTime() || 0) - (a.updatedAt?.toDate()?.getTime() || 0)));
        setCourseProgress(coursesProg);
      } catch (err: any) {
        console.error("Erreur lors du chargement des données:", err);
        setError(`Erreur: ${err.message || "Impossible de charger les activités."}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  // Toggle sections
  const toggleSection = (courseId: string) =>
    setOpenSections((prev) => ({ ...prev, [courseId]: !prev[courseId] }));

  // États de chargement et erreurs
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-gray-100"><div className="text-2xl font-semibold text-gray-600 animate-pulse">Chargement des activités...</div></div>;
  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <p className="text-2xl text-red-500 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Réessayer</button>
      </div>
    </div>
  );
  if (!userId) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <p className="text-2xl text-red-500 mb-4">Connexion requise.</p>
        <button onClick={() => signInAnonymously(auth)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Se connecter anonymement</button>
      </div>
    </div>
  );

  // Rendu principal
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 p-6">
      <h1 className="mb-8 text-center text-4xl font-bold text-gray-800">📊 Mes Activités</h1>

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

          const vStats = getVideoStats(courseVideoProgress);
          const qStats: Record<string, QuizStatsType> = getQuizStats(courseQuizResponses);

          return (
            <div key={enrollment.id} className="mb-6 rounded-lg bg-white p-6 shadow-lg">
              <CourseStats
                enrollment={enrollment}
                courseTitle={courseTitle}
                videoPercent={vStats.percent}
                quizAvg={qStats[courseId]?.first?.avgScore || 0}
                courseStatus={courseStatus}
                isOpen={isOpen}
                onToggle={() => toggleSection(courseId)}
              />
              {isOpen && (
                <div className="mt-6 space-y-8">
                  <VideoStats videos={courseVideoProgress} videoTitles={videos} />
                  <QuizStats quizzes={courseQuizResponses} courseTitles={courses} />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

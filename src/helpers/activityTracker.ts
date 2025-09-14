"use client";

import { db } from "@/firebase";
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

interface QuizResponseData {
  quizId: string;
  userId: string;
  videoId: string;
  courseId: string;
  userAnswers: Record<number, number>;
  correctAnswers: Record<number, number>;
  isCorrect: number; // score %
  submittedAt: any;
}

interface VideoProgressData {
  userId: string;
  videoId: string;
  courseId: string;
  minutesWatched: number;
  minutesRemaining: number;
  lastPosition: number;
  completed: boolean;
  updatedAt: any;
}

// 🔹 Enregistrer réponse quiz
export async function logQuizResponse(data: QuizResponseData) {
  try {
    await addDoc(collection(db, "quizResponses"), {
      ...data,
      submittedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Erreur logQuizResponse:", err);
  }
}

// 🔹 Mettre à jour progression vidéo
export async function logVideoProgress(data: VideoProgressData) {
  try {
    const docId = `${data.userId}_${data.videoId}`;
    await setDoc(doc(db, "videoProgress", docId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Erreur logVideoProgress:", err);
  }
}

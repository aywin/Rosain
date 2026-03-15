// src/helpers/activityTracker.ts
"use client";

import { db } from "@/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

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

export interface ExoProgressData {
  userId: string;
  exoId: string;
  courseId: string;
  score: number;
  total: number;
  scorePercent: number;
  answers: Record<string, number[]>;
  completedAt: any;
}

// ── Quiz : première + dernière tentative ──
export async function logQuizResponse(data: QuizResponseData) {
  try {
    const firstRef = doc(db, "quizResponses", `${data.userId}_${data.quizId}_first`);
    const lastRef = doc(db, "quizResponses", `${data.userId}_${data.quizId}_last`);

    // ⚡ Lire first et écrire last en parallèle
    const [firstSnap] = await Promise.all([
      getDoc(firstRef),
      setDoc(lastRef, { ...data, attemptType: "last", submittedAt: serverTimestamp() }),
    ]);

    if (!firstSnap.exists()) {
      await setDoc(firstRef, { ...data, attemptType: "first", submittedAt: serverTimestamp() });
    }
  } catch (err) {
    console.error("Erreur logQuizResponse:", err);
  }
}

// ── Vidéo : setDoc direct, logique max position gérée côté client ──
export async function logVideoProgress(data: VideoProgressData) {
  try {
    await setDoc(
      doc(db, "videoProgress", `${data.userId}_${data.videoId}`),
      { ...data, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    console.error("Erreur logVideoProgress:", err);
  }
}

// ── Exercice : première + dernière tentative ──
export async function logExoProgress(data: ExoProgressData) {
  try {
    const docId = `${data.userId}_${data.exoId}`;
    const firstRef = doc(db, "exerciseProgress", `${docId}_first`);
    const lastRef = doc(db, "exerciseProgress", docId);

    // ⚡ Lire first et écrire last en parallèle
    const [firstSnap] = await Promise.all([
      getDoc(firstRef),
      setDoc(lastRef, { ...data, attemptType: "last", completedAt: serverTimestamp() }),
    ]);

    if (!firstSnap.exists()) {
      await setDoc(firstRef, { ...data, attemptType: "first", completedAt: serverTimestamp() });
    }
  } catch (err) {
    console.error("Erreur logExoProgress:", err);
  }
}
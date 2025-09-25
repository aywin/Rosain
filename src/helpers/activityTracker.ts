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

// 🔹 Enregistrer réponse quiz (1ère + dernière)
export async function logQuizResponse(data: QuizResponseData) {
  try {
    const firstDocRef = doc(db, "quizResponses", `${data.userId}_${data.quizId}_first`);
    const lastDocRef = doc(db, "quizResponses", `${data.userId}_${data.quizId}_last`);

    // Vérifie si la première tentative existe
    const firstSnap = await getDoc(firstDocRef);
    if (!firstSnap.exists()) {
      await setDoc(firstDocRef, {
        ...data,
        attemptType: "first",
        submittedAt: serverTimestamp(),
      });
    }

    // Toujours mettre à jour le doc "last"
    await setDoc(lastDocRef, {
      ...data,
      attemptType: "last",
      submittedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Erreur logQuizResponse:", err);
  }
}

// 🔹 Mettre à jour progression vidéo (ne pas écraser si inférieur)
export async function logVideoProgress(data: VideoProgressData) {
  try {
    const docId = `${data.userId}_${data.videoId}`;
    const docRef = doc(db, "videoProgress", docId);

    // Récupère le doc existant
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // S'il n'existe pas encore → création
      await setDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingData = docSnap.data() as VideoProgressData;

      // Met à jour uniquement si la nouvelle position est supérieure
      if (data.lastPosition > existingData.lastPosition) {
        await setDoc(docRef, {
          ...data,
          updatedAt: serverTimestamp(),
        });
      }
      // sinon on ne fait rien
    }
  } catch (err) {
    console.error("Erreur logVideoProgress:", err);
  }
}

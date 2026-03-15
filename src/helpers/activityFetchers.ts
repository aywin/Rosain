// src/helpers/activityFetchers.ts
import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

const BATCH_SIZE = 30;

// ── Progression des cours ──
export async function getCourseProgress(userId: string) {
  if (!userId) return [];
  const q = query(collection(db, "progress"), where("id_user", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Progression des vidéos ──
// ⚡ Batch au lieu de N getDoc séquentiels
export async function getVideoProgress(
  userId: string,
  courseVideos: { id: string }[]
) {
  if (!userId || courseVideos.length === 0) return [];

  const docIds = courseVideos.map((v) => `${userId}_${v.id}`);
  const results: any[] = [];

  for (let i = 0; i < docIds.length; i += BATCH_SIZE) {
    const batch = docIds.slice(i, i + BATCH_SIZE);
    const snap = await getDocs(
      query(collection(db, "videoProgress"), where("__name__", "in", batch))
    );
    snap.docs.forEach((d) => results.push({ id: d.id, ...d.data() }));
  }

  return results;
}

// ── Réponses aux quiz ──
export async function getQuizResponses(userId: string, courseId: string) {
  if (!userId) return [];
  const q = query(
    collection(db, "quizResponses"),
    where("userId", "==", userId),
    where("courseId", "==", courseId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Progression des exercices ──
export async function getExoProgress(
  userId: string,
  exoIds: string[]
) {
  if (!userId || exoIds.length === 0) return [];

  const docIds = exoIds.map((id) => `${userId}_${id}`);
  const results: any[] = [];

  for (let i = 0; i < docIds.length; i += BATCH_SIZE) {
    const batch = docIds.slice(i, i + BATCH_SIZE);
    const snap = await getDocs(
      query(collection(db, "exerciseProgress"), where("__name__", "in", batch))
    );
    snap.docs.forEach((d) => results.push({ id: d.id, ...d.data() }));
  }

  return results;
}
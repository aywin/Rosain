import { db, auth } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

// Progression des cours
export async function getCourseProgress() {
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    collection(db, "progress"),
    where("id_user", "==", user.uid)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Progression des vidéos
export async function getVideoProgress(courseVideos: { id: string }[]) {
  const user = auth.currentUser;
  if (!user) return [];

  const results = [];
  for (const v of courseVideos) {
    const ref = doc(db, "videoProgress", `${user.uid}_${v.id}`);
    const snap = await getDoc(ref);
    if (snap.exists()) results.push({ videoId: v.id, ...snap.data() });
  }
  return results;
}

// Réponses aux quiz
export async function getQuizResponses(courseId: string) {
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    collection(db, "quizResponses"),
    where("userId", "==", user.uid),
    where("courseId", "==", courseId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

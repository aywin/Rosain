import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase";

export interface VideoProgress {
  completed: boolean;
  courseId: string;
  lastPosition: number;
  minutesRemaining: number;
  minutesWatched: number;
  updatedAt: Date;
  userId: string;
  videoId: string;
}

export interface VideoProgressWithId extends VideoProgress {
  id: string;
}

export function useVideoProgress(userId?: string) {
  const [progress, setProgress] = useState<VideoProgressWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProgress([]);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      try {
        const q = query(
          collection(db, "videoProgress"),
          where("userId", "==", userId)
        );
        const snap = await getDocs(q);
        setProgress(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as VideoProgress),
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [userId]);

  return { progress, loading };
}

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { QuizResponse } from "@/utils/progress";

export function useQuizResponses(userId?: string) {
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setResponses([]);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      try {
        const q = query(
          collection(db, "quizResponses"),
          where("userId", "==", userId)
        );
        const snap = await getDocs(q);
        setResponses(
          snap.docs.map((d) => {
            const { id: _ignored, ...rest } = d.data() as QuizResponse;
            return { id: d.id, ...rest };
          })
        );
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [userId]);

  return { responses, loading };
}

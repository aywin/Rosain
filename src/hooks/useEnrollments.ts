import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase";

interface Enrollment {
  courseId: string;
  // ajoute ici d’autres champs si besoin
}

interface EnrollmentWithId extends Enrollment {
  id: string;
}

export function useEnrollments(userId?: string) {
  const [enrollments, setEnrollments] = useState<EnrollmentWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setEnrollments([]);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      try {
        const q = query(
          collection(db, "enrollments"),
          where("userId", "==", userId)
        );
        const snap = await getDocs(q);
        setEnrollments(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Enrollment),
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [userId]);

  return { enrollments, loading };
}

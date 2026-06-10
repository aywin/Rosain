"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { isTeacher, isSuperAdmin } from "@/utils/roles";

export default function ProtectTeacherRoute({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      const role = snap.exists() ? snap.data().role : null;
      if (isTeacher(role) || isSuperAdmin(role)) {
        setAllowed(true);
      } else {
        router.push("/");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500 text-sm">Vérification des droits...</div>
    </div>
  );
  if (!allowed) return null;
  return <>{children}</>;
}

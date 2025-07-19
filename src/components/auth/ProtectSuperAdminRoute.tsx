"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

// Usage : <ProtectSuperAdminRoute>{children}</ProtectSuperAdminRoute>
export default function ProtectSuperAdminRoute({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      if (!user) {
        router.push("/login");
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data().role?.trim() === "superadmin") {
        setAllowed(true);
      } else {
        router.push("/");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) return <div>Vérification des droits...</div>;
  if (!allowed) return null;
  return <>{children}</>;
}

"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, BookOpen, CheckCircle, TrendingUp, Users, BarChart3 } from "lucide-react"; // ✅ Import BarChart3

interface UserData {
  nom: string;
  prenom: string;
  email: string;
  role: string;
  statut_paiement: boolean;
  id_ecole?: string | null;
  linkedStudents?: string[];
  pupils?: string[];
  createdAt: any;
}

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [coursesCount, setCoursesCount] = useState(0);
  const [completedCoursesCount, setCompletedCoursesCount] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const router = useRouter();

  // Palette logo
  const colors = {
    darkBlue: "#25364C",
    white: "#FFFFFF",
    primaryBlue: "#1F77B0",
    primaryGreen: "#568348ff",
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (!userSnap.exists()) return;

        const data = userSnap.data() as UserData;
        setUserData(data);

        const enrollSnap = await getDocs(
          query(collection(db, "enrollments"), where("id_user", "==", user.uid))
        );
        setCoursesCount(enrollSnap.size);

        const progressSnap = await getDocs(
          query(collection(db, "progress"), where("id_user", "==", user.uid))
        );
        const completed = progressSnap.docs.filter((d) => d.data().status === "done").length;
        setCompletedCoursesCount(completed);
        setProgressPercent(enrollSnap.size > 0 ? Math.round((completed / enrollSnap.size) * 100) : 0);
      } catch (err) {
        console.error("Erreur chargement profil :", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const logout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  if (loading) return <LoadingHero colors={colors} />;

  if (!userData)
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        Utilisateur introuvable.
      </div>
    );

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Header */}
      <div
        className="rounded-xl shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between mb-8"
        style={{ backgroundColor: colors.darkBlue, color: colors.white }}
      >
        <div className="flex items-center space-x-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ backgroundColor: colors.primaryGreen, color: colors.white }}
          >
            {userData.prenom?.[0]}
            {userData.nom?.[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{userData.prenom} {userData.nom}</h1>
            <p className="opacity-90">{userData.email}</p>
          </div>
        </div>
        <div className="flex mt-4 md:mt-0 space-x-3">
          <button
            onClick={() => router.push("/profile/edit")}
            style={{ backgroundColor: colors.primaryBlue }}
            className="text-white px-4 py-2 rounded-lg font-semibold transition hover:opacity-90"
          >
            Modifier
          </button>
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard icon={<User style={{ color: colors.primaryBlue }} />} label="Rôle" value={userData.role} />
        <StatCard icon={<BookOpen style={{ color: colors.primaryGreen }} />} label="Cours suivis" value={coursesCount} />
        <StatCard icon={<CheckCircle style={{ color: colors.darkBlue }} />} label="Cours terminés" value={completedCoursesCount} />
        <StatCard
          icon={<TrendingUp style={{ color: colors.primaryBlue }} />}
          label="Progression"
          value={`${progressPercent}%`}
          progress={progressPercent}
          barColor={colors.primaryBlue}
        />
      </div>

      {/* ✅ NOUVELLE SECTION - Quotas IA */}
      <div className="rounded-xl shadow p-6 mb-8" style={{ backgroundColor: "#F0F9FF" }}>
        <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: colors.darkBlue }}>
          <BarChart3 className="mr-2" style={{ color: colors.primaryBlue }} /> Mes Quotas IA
        </h2>
        <p className="text-gray-600 mb-4">
          Consultez votre utilisation quotidienne des assistants vidéo et exercices
        </p>
        <Link
          href="/quota-ai"
          className="inline-block px-6 py-3 rounded-lg font-medium transition text-white"
          style={{ backgroundColor: colors.primaryBlue }}
        >
          Voir mes quotas →
        </Link>
      </div>

      {/* Pupils section */}
      {(userData.role === "parent" || userData.role === "tuteur") && (
        <div className="rounded-xl shadow p-6 mb-8" style={{ backgroundColor: "#F5FDF7" }}>
          <h2 className="text-xl font-semibold mb-4 flex items-center" style={{ color: colors.darkBlue }}>
            <Users className="mr-2" style={{ color: colors.primaryBlue }} /> Mes élèves
          </h2>
          {userData.pupils?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {userData.pupils.map((email) => (
                <div
                  key={email}
                  className="p-3 rounded-lg border flex items-center justify-between"
                  style={{ borderColor: colors.primaryBlue, backgroundColor: colors.white }}
                >
                  <span>{email}</span>
                  <span
                    className="px-2 py-1 text-xs rounded text-white"
                    style={{ backgroundColor: colors.primaryBlue }}
                  >
                    lié
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Aucun élève associé.</p>
          )}
        </div>
      )}

      {/* Informations */}
      <div className="rounded-xl shadow p-6 mb-8" style={{ backgroundColor: "#F8FAFC" }}>
        <h2 className="text-xl font-semibold mb-3" style={{ color: colors.darkBlue }}>
          Informations
        </h2>
        <p><span className="font-medium">École :</span> {userData.id_ecole || "—"}</p>
        <p>
          <span className="font-medium">Compte créé le :</span>{" "}
          {userData.createdAt?.toDate
            ? userData.createdAt.toDate().toLocaleDateString()
            : new Date(userData.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Dashboard CTA */}
      <div
        className="rounded-xl shadow p-6 text-center"
        style={{ backgroundColor: colors.primaryGreen, color: colors.white }}
      >
        <h2 className="text-2xl font-semibold mb-2">Mes activités</h2>
        <p className="mb-4 opacity-90">Consultez vos vidéos, quiz et progression détaillée.</p>
        <Link
          href="/mark"
          className="inline-block px-6 py-2 rounded-lg font-medium transition"
          style={{ backgroundColor: colors.white, color: colors.primaryGreen }}
        >
          Voir mon dashboard
        </Link>
      </div>
    </div>
  );
}

/* Carte Statistique */
function StatCard({ icon, label, value, progress, barColor }: { icon: React.ReactNode; label: string; value: string | number; progress?: number; barColor?: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center text-center">
      <div className="mb-2">{icon}</div>
      <h3 className="text-gray-500">{label}</h3>
      <p className="text-xl font-semibold">{value}</p>
      {progress !== undefined && (
        <div className="w-full h-2 bg-gray-200 rounded mt-2">
          <div className="h-2 rounded" style={{ width: `${progress}%`, backgroundColor: barColor }}></div>
        </div>
      )}
    </div>
  );
}

function LoadingHero({ colors }: { colors: any }) {
  return (
    <div
      className="flex items-center justify-center min-h-screen text-white text-center"
      style={{ backgroundColor: colors.darkBlue }}
    >
      <div className="text-xl animate-pulse">Chargement du profil...</div>
    </div>
  );
}
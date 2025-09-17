"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, BookOpen, CheckCircle, TrendingUp, Users } from "lucide-react";

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

  if (loading) return <LoadingHero />;

  if (!userData)
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        Utilisateur introuvable.
      </div>
    );

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0D1B2A] to-[#1B9AAA] rounded-xl shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between mb-8 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-[#4CAF50] flex items-center justify-center text-2xl font-bold">
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
            className="bg-[#1B9AAA] hover:bg-[#0D1B2A] text-white px-4 py-2 rounded-lg font-semibold transition"
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
        <StatCard icon={<User className="text-[#1B9AAA]" />} label="Rôle" value={userData.role} />
        <StatCard icon={<BookOpen className="text-[#4CAF50]" />} label="Cours suivis" value={coursesCount} />
        <StatCard icon={<CheckCircle className="text-[#0D1B2A]" />} label="Cours terminés" value={completedCoursesCount} />
        <StatCard
          icon={<TrendingUp className="text-[#1B9AAA]" />}
          label="Progression"
          value={`${progressPercent}%`}
          progress={progressPercent}
        />
      </div>

      {/* Pupils section */}
      {(userData.role === "parent" || userData.role === "tuteur") && (
        <div className="bg-[#E0F7FA] rounded-xl shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-[#0D1B2A]">
            <Users className="mr-2 text-[#1B9AAA]" /> Mes élèves
          </h2>
          {userData.pupils?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {userData.pupils.map((email) => (
                <div
                  key={email}
                  className="p-3 rounded-lg border border-[#1B9AAA] bg-white flex items-center justify-between"
                >
                  <span>{email}</span>
                  <span className="px-2 py-1 text-xs rounded bg-[#1B9AAA] text-white">lié</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Aucun élève associé.</p>
          )}
        </div>
      )}

      {/* Informations */}
      <div className="bg-[#F0F8FF] rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#0D1B2A]">Informations</h2>
        <p><span className="font-medium">École :</span> {userData.id_ecole || "—"}</p>
        <p>
          <span className="font-medium">Compte créé le :</span>{" "}
          {userData.createdAt?.toDate
            ? userData.createdAt.toDate().toLocaleDateString()
            : new Date(userData.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Dashboard CTA */}
      <div className="bg-gradient-to-r from-[#0D1B2A] to-[#1B9AAA] rounded-xl shadow p-6 text-center text-white">
        <h2 className="text-2xl font-semibold mb-2">Mes activités</h2>
        <p className="mb-4 opacity-90">Consultez vos vidéos, quiz et progression détaillée.</p>
        <Link
          href="/mark"
          className="inline-block bg-white text-[#1B9AAA] px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition"
        >
          Voir mon dashboard
        </Link>
      </div>
    </div>
  );
}

/* Composant carte statistique */
function StatCard({ icon, label, value, progress }: { icon: React.ReactNode; label: string; value: string | number; progress?: number }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center text-center">
      <div className="mb-2">{icon}</div>
      <h3 className="text-gray-500">{label}</h3>
      <p className="text-xl font-semibold">{value}</p>
      {progress !== undefined && (
        <div className="w-full h-2 bg-gray-200 rounded mt-2">
          <div className="h-2 rounded" style={{ width: `${progress}%`, backgroundColor: "#1B9AAA" }}></div>
        </div>
      )}
    </div>
  );
}

function LoadingHero() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-[#0D1B2A] to-[#1B9AAA] text-white text-center">
      <div className="text-xl animate-pulse">Chargement du profil...</div>
    </div>
  );
}

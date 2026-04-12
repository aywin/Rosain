"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, BookOpen, CheckCircle, TrendingUp, Users, BarChart3, ExternalLink, Clock } from "lucide-react";

interface UserData {
  nom: string;
  prenom: string;
  email: string;
  role: string;
  statut_paiement: boolean;
  id_ecole?: string | null;
  linkedStudents?: string[];
  pendingChildrenEmails?: string[];
  createdAt: any;
}

interface ChildInfo {
  uid: string;
  nom: string;
  prenom: string;
  email: string;
}

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [coursesCount, setCoursesCount] = useState(0);
  const [completedCoursesCount, setCompletedCoursesCount] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [linkedChildren, setLinkedChildren] = useState<ChildInfo[]>([]);
  const router = useRouter();

  const colors = {
    darkBlue: "#25364C",
    white: "#FFFFFF",
    primaryBlue: "#1F77B0",
    primaryGreen: "#568348ff",
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) { router.push("/login"); return; }

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (!userSnap.exists()) return;

        const data = userSnap.data() as UserData;
        setUserData(data);

        // Enrollments + progression
        const [enrollSnap, progressSnap] = await Promise.all([
          getDocs(query(collection(db, "enrollments"), where("id_user", "==", user.uid))),
          getDocs(query(collection(db, "progress"), where("id_user", "==", user.uid))),
        ]);
        const completed = progressSnap.docs.filter(d => d.data().status === "done").length;
        setCoursesCount(enrollSnap.size);
        setCompletedCoursesCount(completed);
        setProgressPercent(enrollSnap.size > 0 ? Math.round((completed / enrollSnap.size) * 100) : 0);

        // Enfants liés — fetch noms
        const linked = data.linkedStudents || [];
        if (linked.length > 0) {
          const BATCH = 30;
          const children: ChildInfo[] = [];
          for (let i = 0; i < linked.length; i += BATCH) {
            const batch = linked.slice(i, i + BATCH);
            const snaps = await Promise.all(batch.map(uid => getDoc(doc(db, "users", uid))));
            snaps.forEach(s => {
              if (s.exists()) {
                const d = s.data();
                children.push({ uid: s.id, nom: d.nom || "", prenom: d.prenom || "", email: d.email || "" });
              }
            });
          }
          setLinkedChildren(children);
        }
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
  if (!userData) return (
    <div className="flex items-center justify-center min-h-screen text-red-500">Utilisateur introuvable.</div>
  );

  const isParentOrTutor = userData.role === "parent" || userData.role === "tuteur";

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Header */}
      <div className="rounded-xl shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between mb-8"
        style={{ backgroundColor: colors.darkBlue, color: colors.white }}>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ backgroundColor: colors.primaryGreen, color: colors.white }}>
            {userData.prenom?.[0]}{userData.nom?.[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{userData.prenom} {userData.nom}</h1>
            <p className="opacity-90">{userData.email}</p>
          </div>
        </div>
        <div className="flex mt-4 md:mt-0 space-x-3">
          <button onClick={() => router.push("/profile/edit")}
            style={{ backgroundColor: colors.primaryBlue }}
            className="text-white px-4 py-2 rounded-lg font-semibold transition hover:opacity-90">
            Modifier
          </button>
          <button onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition">
            Déconnexion
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard icon={<User style={{ color: colors.primaryBlue }} />} label="Rôle" value={userData.role} />
        <StatCard icon={<BookOpen style={{ color: colors.primaryGreen }} />} label="Cours suivis" value={coursesCount} />
        <StatCard icon={<CheckCircle style={{ color: colors.darkBlue }} />} label="Cours terminés" value={completedCoursesCount} />
        <StatCard icon={<TrendingUp style={{ color: colors.primaryBlue }} />} label="Progression"
          value={`${progressPercent}%`} progress={progressPercent} barColor={colors.primaryBlue} />
      </div>

      {/* Quotas IA */}
      <div className="rounded-xl shadow p-6 mb-8" style={{ backgroundColor: "#F0F9FF" }}>
        <h2 className="text-xl font-semibold mb-2 flex items-center" style={{ color: colors.darkBlue }}>
          <BarChart3 className="mr-2" style={{ color: colors.primaryBlue }} /> Mes Quotas IA
        </h2>
        <p className="text-gray-600 mb-4">Consultez votre utilisation quotidienne des assistants vidéo et exercices</p>
        <Link href="/quota-ai" className="inline-block px-6 py-3 rounded-lg font-medium transition text-white"
          style={{ backgroundColor: colors.primaryBlue }}>
          Voir mes quotas →
        </Link>
      </div>

      {/* ── Section parent / tuteur ── */}
      {isParentOrTutor && (
        <div className="rounded-xl shadow p-6 mb-8" style={{ backgroundColor: "#F0FDFA" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: colors.darkBlue }}>
              <Users className="w-5 h-5" style={{ color: "#0D9488" }} />
              Mes enfants
            </h2>
            <button onClick={() => router.push("/parent")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: "#0D9488" }}>
              <ExternalLink className="w-4 h-4" />
              Espace parent
            </button>
          </div>

          {/* Enfants liés */}
          {linkedChildren.length > 0 ? (
            <div className="space-y-2 mb-4">
              {linkedChildren.map(child => (
                <div key={child.uid} className="flex items-center justify-between bg-white border border-teal-100 px-4 py-2.5 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{child.prenom} {child.nom}</p>
                    <p className="text-xs text-gray-500">{child.email}</p>
                  </div>
                  <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Lié
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-4">Aucun enfant lié pour l'instant.</p>
          )}

          {/* Emails en attente */}
          {(userData.pendingChildrenEmails || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> En attente d'inscription
              </p>
              <div className="flex flex-wrap gap-2">
                {(userData.pendingChildrenEmails || []).map(email => (
                  <span key={email} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">
                    {email}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Informations */}
      <div className="rounded-xl shadow p-6 mb-8" style={{ backgroundColor: "#F8FAFC" }}>
        <h2 className="text-xl font-semibold mb-3" style={{ color: colors.darkBlue }}>Informations</h2>
        <p><span className="font-medium">École :</span> {userData.id_ecole || "—"}</p>
        <p>
          <span className="font-medium">Compte créé le :</span>{" "}
          {userData.createdAt?.toDate
            ? userData.createdAt.toDate().toLocaleDateString()
            : new Date(userData.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Dashboard CTA */}
      <div className="rounded-xl shadow p-6 text-center"
        style={{ backgroundColor: colors.primaryGreen, color: colors.white }}>
        <h2 className="text-2xl font-semibold mb-2">Mes activités</h2>
        <p className="mb-4 opacity-90">Consultez vos vidéos, quiz et progression détaillée.</p>
        <Link href="/mark" className="inline-block px-6 py-2 rounded-lg font-medium transition"
          style={{ backgroundColor: colors.white, color: colors.primaryGreen }}>
          Voir mon dashboard
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, progress, barColor }: {
  icon: React.ReactNode; label: string; value: string | number; progress?: number; barColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center text-center">
      <div className="mb-2">{icon}</div>
      <h3 className="text-gray-500">{label}</h3>
      <p className="text-xl font-semibold">{value}</p>
      {progress !== undefined && (
        <div className="w-full h-2 bg-gray-200 rounded mt-2">
          <div className="h-2 rounded" style={{ width: `${progress}%`, backgroundColor: barColor }} />
        </div>
      )}
    </div>
  );
}

function LoadingHero({ colors }: { colors: any }) {
  return (
    <div className="flex items-center justify-center min-h-screen text-white text-center"
      style={{ backgroundColor: colors.darkBlue }}>
      <div className="text-xl animate-pulse">Chargement du profil...</div>
    </div>
  );
}
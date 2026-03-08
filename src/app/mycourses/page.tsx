"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import {
  collection, getDocs, query, where,
  doc, deleteDoc,
} from "firebase/firestore";
import { loadLevelsAndSubjects, mapCourseWithNamesSync, Course } from "@/utils/mapCourse";
import CourseCard from "@/components/course/CourseCard";
import AlertModal from "@/components/ui/AlertModal";
import { FaSpinner, FaGraduationCap, FaBookOpen, FaSignInAlt, FaSearch } from "react-icons/fa";

interface CourseWithStatus extends Course {
  enrolled: boolean;
  progressStatus: "not_started" | "in_progress" | "done";
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_started: { label: "Non commencé", color: "bg-gray-200 text-gray-600" },
  in_progress: { label: "En cours", color: "bg-amber-100 text-amber-700 border border-amber-300" },
  done: { label: "Terminé", color: "bg-teal-100 text-teal-700 border border-teal-300" },
};

export default function MyCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLogged, setNotLogged] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [alertCourseId, setAlertCourseId] = useState<string | null>(null);
  const [activeNiveau, setActiveNiveau] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) { setNotLogged(true); setLoading(false); return; }
      setUserId(user.uid);

      try {
        // ⚡ TOUT en parallèle : levels/subjects + enrollments + progress = 3 requêtes simultanées
        const [{ levelsCache, subjectsCache }, enrollSnap, progressSnap] = await Promise.all([
          loadLevelsAndSubjects(),
          getDocs(query(collection(db, "enrollments"), where("id_user", "==", user.uid))),
          getDocs(query(collection(db, "progress"), where("id_user", "==", user.uid))),
        ]);

        const enrollments = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; id_course: string }));
        if (enrollments.length === 0) { setCourses([]); setLoading(false); return; }

        const progressMap = new Map<string, "not_started" | "in_progress" | "done">();
        progressSnap.docs.forEach(d => {
          const data = d.data();
          progressMap.set(data.id_course, data.status || "not_started");
        });

        // ⚡ Batch Firestore : max 30 IDs par requête "in" (limite Firestore)
        const courseIds = [...new Set(enrollments.map(e => e.id_course))];
        const BATCH = 30;
        const batches: string[][] = [];
        for (let i = 0; i < courseIds.length; i += BATCH) {
          batches.push(courseIds.slice(i, i + BATCH));
        }

        const courseSnaps = await Promise.all(
          batches.map(batch =>
            getDocs(query(collection(db, "courses"), where("__name__", "in", batch)))
          )
        );

        const courseList: CourseWithStatus[] = [];
        courseSnaps.forEach(snap => {
          snap.docs.forEach(docSnap => {
            const mapped = mapCourseWithNamesSync(docSnap.id, docSnap.data(), levelsCache, subjectsCache);
            courseList.push({ ...mapped, enrolled: true, progressStatus: progressMap.get(docSnap.id) || "not_started" });
          });
        });

        const unique = Array.from(new Map(courseList.map(c => [c.id, c])).values());
        unique.sort((a, b) => {
          if (a.niveau !== b.niveau) return a.niveau.localeCompare(b.niveau);
          if (a.matiere !== b.matiere) return a.matiere.localeCompare(b.matiere);
          return a.titre.localeCompare(b.titre);
        });

        setCourses(unique);
        if (unique.length > 0) setActiveNiveau(unique[0].niveau);
      } catch (err) {
        console.error("Erreur récupération mes cours :", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleConfirmUnenroll = async () => {
    if (!alertCourseId || !userId) return;
    try {
      const qE = query(collection(db, "enrollments"), where("id_user", "==", userId), where("id_course", "==", alertCourseId));
      for (const d of (await getDocs(qE)).docs) await deleteDoc(doc(db, "enrollments", d.id));
      const qP = query(collection(db, "progress"), where("id_user", "==", userId), where("id_course", "==", alertCourseId));
      for (const d of (await getDocs(qP)).docs) await deleteDoc(doc(db, "progress", d.id));
      setCourses(prev => prev.filter(c => c.id !== alertCourseId));
    } catch (err) {
      console.error("Erreur désinscription :", err);
    } finally {
      setAlertCourseId(null);
    }
  };

  if (loading) return <LoadingScreen />;
  if (notLogged) return <NotLoggedScreen router={router} />;
  if (courses.length === 0) return <EmptyScreen router={router} />;

  // Niveaux uniques dans l'ordre
  const niveaux = Array.from(new Set(courses.map(c => c.niveau)));

  // Filtrage
  const filtered = courses.filter(c => {
    const matchNiveau = !activeNiveau || c.niveau === activeNiveau;
    const matchSearch = !search || c.titre.toLowerCase().includes(search.toLowerCase()) || c.matiere.toLowerCase().includes(search.toLowerCase());
    return matchNiveau && matchSearch;
  });

  // Groupement par matière dans le niveau actif
  const grouped: Record<string, CourseWithStatus[]> = {};
  filtered.forEach(c => {
    if (!grouped[c.matiere]) grouped[c.matiere] = [];
    grouped[c.matiere].push(c);
  });

  // Stats
  const done = courses.filter(c => c.progressStatus === "done").length;
  const inProgress = courses.filter(c => c.progressStatus === "in_progress").length;

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* ══ HEADER ══ */}
      <div className="bg-teal-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FaGraduationCap size={16} className="text-teal-200" />
                <p className="text-teal-200 text-xs font-medium uppercase tracking-widest">Mon espace</p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">Mes cours</h1>
            </div>

            {/* Stats — 3 blocs côte à côte, compacts sur mobile */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold">{courses.length}</p>
                <p className="text-teal-200 text-[11px]">inscrits</p>
              </div>
              <div className="w-px h-8 sm:h-10 bg-teal-600" />
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-amber-300">{inProgress}</p>
                <p className="text-teal-200 text-[11px]">en cours</p>
              </div>
              <div className="w-px h-8 sm:h-10 bg-teal-600" />
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-emerald-300">{done}</p>
                <p className="text-teal-200 text-[11px]">terminés</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs niveaux ── */}
        <div className="max-w-7xl mx-auto px-2 sm:px-6 flex items-end gap-0 border-b border-teal-600 overflow-x-auto scrollbar-none">
          {niveaux.map(niveau => {
            const count = courses.filter(c => c.niveau === niveau).length;
            const isActive = activeNiveau === niveau;
            return (
              <button
                key={niveau}
                onClick={() => setActiveNiveau(niveau)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 border-b-2 -mb-px ${isActive
                  ? "border-white text-white bg-teal-800/40"
                  : "border-transparent text-teal-300 hover:text-white hover:bg-teal-800/20"
                  }`}
              >
                {niveau}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? "bg-white text-teal-700" : "bg-teal-600 text-teal-100"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ CONTENU ══ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Barre de recherche — pleine largeur mobile */}
        <div className="mb-6 sm:mb-8 flex items-center gap-3 w-full sm:max-w-sm">
          <div className="relative flex-1">
            <FaSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un cours..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 sm:py-2 text-sm border border-gray-200 bg-white focus:outline-none focus:border-teal-500 transition"
              style={{ borderRadius: 0 }}
            />
          </div>
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-gray-400 hover:text-gray-600 transition flex-shrink-0">
              Effacer
            </button>
          )}
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FaSearch size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun cours trouvé pour "{search}"</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([matiere, coursList]) => (
              <div key={matiere}>

                {/* Label matière */}
                <div className="flex items-center gap-3 mb-4 sm:mb-5">
                  <div className="w-1 h-6 bg-teal-700 flex-shrink-0" />
                  <h2 className="text-sm sm:text-base font-bold text-gray-800">{matiere}</h2>
                  <span className="text-xs text-gray-400">{coursList.length} cours</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                  {coursList.map((course, idx) => {
                    const status = STATUS_LABELS[course.progressStatus];
                    return (
                      <div key={`${course.id}-${idx}`} className="flex flex-col bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">

                        {/* Badge statut */}
                        <div className="px-3 pt-2.5 pb-0 flex justify-end">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 ${status.color}`}>
                            {status.label}
                          </span>
                        </div>

                        {/* CourseCard existant */}
                        <div className="flex-1 cursor-pointer" onClick={() => router.push(`/tuto/${course.id}`)}>
                          <CourseCard
                            course={course}
                            onEnroll={() => router.push(`/tuto/${course.id}`)}
                          />
                        </div>

                        {/* Actions */}
                        <div className="border-t border-gray-100 flex">
                          <button
                            onClick={() => router.push(`/tuto/${course.id}`)}
                            className="flex-1 py-2.5 sm:py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50 active:bg-teal-100 transition flex items-center justify-center gap-1.5"
                          >
                            <FaBookOpen size={11} />
                            Continuer
                          </button>
                          <div className="w-px bg-gray-100" />
                          <button
                            onClick={() => setAlertCourseId(course.id)}
                            className="px-4 py-2.5 sm:py-2 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition"
                            title="Se désinscrire"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {alertCourseId && (
        <AlertModal
          message="Une fois désinscrit, l'état de progression sera perdu. Si vous revenez, vous recommencerez à 0. Voulez-vous vraiment vous désinscrire ?"
          onConfirm={handleConfirmUnenroll}
          onCancel={() => setAlertCourseId(null)}
        />
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="bg-teal-700 min-h-screen flex flex-col justify-center items-center text-white gap-4">
      <FaSpinner className="animate-spin text-4xl text-teal-200" />
      <p className="text-lg font-medium">Chargement de vos cours...</p>
    </div>
  );
}

function NotLoggedScreen({ router }: { router: any }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 bg-teal-700 flex items-center justify-center mb-5" style={{ borderRadius: 0 }}>
        <FaGraduationCap size={28} className="text-white" />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Mes cours</h1>
      <p className="text-gray-500 text-sm mb-6">Connectez-vous pour accéder à vos cours.</p>
      <button
        onClick={() => router.push("/login")}
        className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-6 py-2.5 text-sm font-semibold transition"
        style={{ borderRadius: 0 }}
      >
        <FaSignInAlt size={14} />
        Se connecter
      </button>
    </div>
  );
}

function EmptyScreen({ router }: { router: any }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 bg-teal-50 border-2 border-teal-700 flex items-center justify-center mb-5" style={{ borderRadius: 0 }}>
        <FaBookOpen size={24} className="text-teal-700" />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Aucun cours inscrit</h1>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">
        Vous n'êtes inscrit à aucun cours pour l'instant. Explorez le catalogue pour commencer.
      </p>
      <button
        onClick={() => router.push("/explorer")}
        className="bg-teal-700 hover:bg-teal-800 text-white px-6 py-2.5 text-sm font-semibold transition"
        style={{ borderRadius: 0 }}
      >
        Explorer les cours
      </button>
    </div>
  );
}
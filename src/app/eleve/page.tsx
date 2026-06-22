"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  BookOpen, FileText, ClipboardList, Clock, Loader2,
  ChevronRight, Users, Check, AlertCircle, ExternalLink, Star,
  AlertTriangle,
} from "lucide-react";
import {
  getStudentAssignments,
  getStudentSubmissions,
  getStudentGroupsInfo,
  updateSubmissionStatus,
} from "@/helpers/teacherFetchers";
import type { Assignment, Submission, Group } from "@/type/teacher";

const TYPE_LABELS: Record<string, string> = {
  course: "Cours",
  exercise: "Exercice",
  devoir: "Devoir",
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
  course: <BookOpen className="w-4 h-4" />,
  exercise: <FileText className="w-4 h-4" />,
  devoir: <ClipboardList className="w-4 h-4" />,
};
const STATUS_LABELS: Record<string, string> = {
  not_started: "Non commencé",
  in_progress: "En cours",
  submitted: "Remis",
  corrected: "Corrigé",
};
const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-500",
  in_progress: "bg-blue-100 text-blue-700",
  submitted: "bg-amber-100 text-amber-700",
  corrected: "bg-green-100 text-green-700",
};

export default function EleveDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, Submission>>({});
  const [groups, setGroups] = useState<Group[]>([]);
  const [markingDone, setMarkingDone] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }
      setUserId(user.uid);

      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setStudentName(d.prenom || d.nom || "");
      }

      const [assignList, subList, groupList] = await Promise.all([
        getStudentAssignments(user.uid),
        getStudentSubmissions(user.uid),
        getStudentGroupsInfo(user.uid),
      ]);

      setAssignments(assignList);
      setGroups(groupList);

      const map: Record<string, Submission> = {};
      subList.forEach((s) => { map[s.assignmentId] = s; });
      setSubmissionsMap(map);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const getStatus = (a: Assignment): string =>
    submissionsMap[a.id]?.status || "not_started";

  const handleOpen = async (a: Assignment) => {
    if (!userId) return;
    const status = getStatus(a);

    if (a.type === "course" && a.contentId) {
      if (status === "not_started") {
        await updateSubmissionStatus(a.id, userId, a.groupId, "in_progress");
        setSubmissionsMap((prev) => ({
          ...prev,
          [a.id]: { ...(prev[a.id] || {}), assignmentId: a.id, studentId: userId, groupId: a.groupId, status: "in_progress" } as Submission,
        }));
      }
      router.push(`/courses/${a.contentId}`);
    } else if (a.type === "exercise") {
      if (status === "not_started") {
        await updateSubmissionStatus(a.id, userId, a.groupId, "in_progress");
        setSubmissionsMap((prev) => ({
          ...prev,
          [a.id]: { ...(prev[a.id] || {}), assignmentId: a.id, studentId: userId, groupId: a.groupId, status: "in_progress" } as Submission,
        }));
      }
      router.push(`/exercices`);
    } else if (a.type === "devoir") {
      router.push(`/eleve/devoir/${a.id}`);
    }
  };

  const handleMarkDone = async (e: React.MouseEvent, a: Assignment) => {
    e.stopPropagation();
    if (!userId) return;
    setMarkingDone(a.id);
    await updateSubmissionStatus(a.id, userId, a.groupId, "submitted");
    setSubmissionsMap((prev) => ({
      ...prev,
      [a.id]: { ...(prev[a.id] || {}), assignmentId: a.id, studentId: userId, groupId: a.groupId, status: "submitted" } as Submission,
    }));
    setMarkingDone(null);
  };

  const grouped = groups
    .map((g) => ({ group: g, items: assignments.filter((a) => a.groupId === g.id) }))
    .filter((g) => g.items.length > 0);

  const correctedItems = assignments.filter((a) => getStatus(a) === "corrected");

  // Devoirs urgents : deadline dans les 3 prochains jours et pas encore soumis
  const now = new Date();
  const urgentItems = assignments.filter((a) => {
    if (!a.deadline) return false;
    const status = getStatus(a);
    if (status === "submitted" || status === "corrected") return false;
    const dl = new Date((a.deadline as any)?.toDate?.() || a.deadline);
    const diffDays = (dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 3;
  });

  // Devoirs non soumis (à faire)
  const todoItems = assignments.filter((a) => {
    const s = getStatus(a);
    return s === "not_started" || s === "in_progress";
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-7 h-7 animate-spin text-teal-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-teal-700 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <BookOpen className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium uppercase tracking-widest opacity-80">Mon espace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Bonjour{studentName ? `, ${studentName}` : ""}
          </h1>
          <p className="text-teal-100 text-sm mt-1">Retrouvez vos cours, devoirs et résultats</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-teal-50 rounded-2xl p-4">
            <p className="text-2xl font-bold text-teal-700">{assignments.length}</p>
            <p className="text-xs text-gray-600">Travaux au total</p>
          </div>
          <div className={`rounded-2xl p-4 ${todoItems.length > 0 ? "bg-blue-50" : "bg-gray-50"}`}>
            <p className={`text-2xl font-bold ${todoItems.length > 0 ? "text-blue-600" : "text-gray-400"}`}>{todoItems.length}</p>
            <p className="text-xs text-gray-600">À faire</p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4">
            <p className="text-2xl font-bold text-amber-600">
              {assignments.filter((a) => getStatus(a) === "submitted").length}
            </p>
            <p className="text-xs text-gray-600">En attente de note</p>
          </div>
          <div className="bg-green-50 rounded-2xl p-4">
            <p className="text-2xl font-bold text-green-600">{correctedItems.length}</p>
            <p className="text-xs text-gray-600">Corrigé{correctedItems.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* ── Urgent : deadline proche ── */}
        {urgentItems.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-red-600">
                Urgent — deadline proche
              </h2>
            </div>
            <div className="space-y-2">
              {urgentItems.map((a) => {
                const dl = new Date((a.deadline as any)?.toDate?.() || a.deadline);
                const diffH = Math.max(0, Math.round((dl.getTime() - now.getTime()) / (1000 * 60 * 60)));
                return (
                  <div
                    key={`urgent-${a.id}`}
                    onClick={() => handleOpen(a)}
                    className="bg-white border border-red-100 rounded-2xl px-5 py-3 flex items-center justify-between cursor-pointer hover:shadow-sm transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{a.title}</p>
                        <p className="text-xs text-red-500 font-medium">
                          {diffH < 24
                            ? `${diffH}h restante${diffH !== 1 ? "s" : ""}`
                            : `${Math.ceil(diffH / 24)}j restant${Math.ceil(diffH / 24) !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Corrections reçues ── */}
        {correctedItems.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-widest">Mes notes</h2>
            </div>
            <div className="space-y-2">
              {correctedItems.map((a) => {
                const sub = submissionsMap[a.id];
                return (
                  <div
                    key={a.id}
                    className="bg-white border border-green-100 rounded-2xl p-4 cursor-pointer hover:shadow-sm transition"
                    onClick={() => handleOpen(a)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                          <Check className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{a.title}</p>
                          <span className="text-xs text-teal-700">{TYPE_LABELS[a.type]}</span>
                        </div>
                      </div>
                      {sub?.grade !== undefined && (
                        <div className="bg-green-100 text-green-700 px-3 py-1 rounded-xl font-bold text-lg">
                          {sub.grade}<span className="text-sm font-normal text-green-500">/20</span>
                        </div>
                      )}
                    </div>
                    {sub?.feedback && (
                      <div className="mt-2 bg-green-50 rounded-lg px-3 py-2 text-sm text-green-800 italic border border-green-100">
                        "{sub.feedback}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Travaux par groupe ── */}
        {grouped.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold mb-1">Aucun travail pour l'instant</p>
            <p className="text-gray-400 text-sm">Votre professeur n'a pas encore distribué de travaux.</p>
          </div>
        ) : (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">Mes travaux</h2>
            <div className="space-y-8">
              {grouped.map(({ group, items }) => (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">{group.name}</span>
                  </div>
                  <div className="space-y-3">
                    {items.map((a) => {
                      const status = getStatus(a);
                      const sub = submissionsMap[a.id];
                      const isDone = status === "submitted" || status === "corrected";
                      const canMarkDone = (a.type === "course" || a.type === "exercise") && status === "in_progress";
                      const devoirNotSubmitted = a.type === "devoir" && !isDone;

                      return (
                        <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                          {/* Ligne principale */}
                          <div
                            className="flex items-center justify-between cursor-pointer group"
                            onClick={() => handleOpen(a)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? "bg-green-50 text-green-600" : "bg-teal-50 text-teal-700"}`}>
                                {isDone ? <Check className="w-4 h-4" /> : TYPE_ICONS[a.type]}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 text-sm">{a.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-teal-700 font-medium">{TYPE_LABELS[a.type]}</span>
                                  {a.deadline && (
                                    <span className="flex items-center gap-1 text-xs text-gray-400">
                                      <Clock className="w-3 h-3" />
                                      {new Date((a.deadline as any)?.toDate?.() || a.deadline).toLocaleDateString("fr-FR")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[status]}`}>
                                {STATUS_LABELS[status]}
                              </span>
                              {!isDone && <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-teal-700 transition" />}
                            </div>
                          </div>

                          {/* Instructions */}
                          {a.instructions && (
                            <div className="mt-2 flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-gray-500">{a.instructions}</p>
                            </div>
                          )}

                          {/* CTA Devoir non soumis */}
                          {devoirNotSubmitted && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <button
                                type="button"
                                onClick={() => router.push(`/eleve/devoir/${a.id}`)}
                                className="w-full flex items-center justify-center gap-2 bg-teal-700 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-teal-800 transition"
                              >
                                <ClipboardList className="w-4 h-4" />
                                Rendre mon devoir
                              </button>
                            </div>
                          )}

                          {/* Bouton "J'ai terminé" pour cours/exercice en cours */}
                          {canMarkDone && (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
                                <span className="text-xs text-gray-500">Contenu ouvert</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleMarkDone(e, a)}
                                disabled={markingDone === a.id}
                                className="flex items-center gap-1.5 bg-teal-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-teal-800 disabled:opacity-50 transition"
                              >
                                {markingDone === a.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <Check className="w-3 h-3" />}
                                J'ai terminé
                              </button>
                            </div>
                          )}

                          {/* Note inline */}
                          {status === "corrected" && sub && (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
                              <div className="flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1 rounded-lg font-bold">
                                {sub.grade !== undefined ? `${sub.grade}/20` : "Noté"}
                              </div>
                              {sub.feedback && (
                                <p className="text-xs text-gray-500 italic truncate">"{sub.feedback}"</p>
                              )}
                            </div>
                          )}

                          {/* Attente de correction */}
                          {status === "submitted" && a.type === "devoir" && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                Devoir remis — en attente de correction.
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

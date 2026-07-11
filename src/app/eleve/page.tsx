"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { MathJax } from "better-react-mathjax";
import { preprocessLatex } from "@/components/admin/utils/latexUtils";
import QuizPlayerEleve from "@/components/teacher/QuizPlayerEleve";

interface ExoData {
  id: string;
  title?: string;
  statement_text?: string;
  statement_files?: string[];
  difficulty?: string;
}

interface TabData { assignment: Assignment; exos: ExoData[]; loading: boolean; }

import {
  BookOpen, FileText, ClipboardList, Clock, Loader2,
  ChevronRight, Users, Check, AlertCircle, ExternalLink, Star,
  AlertTriangle, X, Download,
} from "lucide-react";
import {
  getStudentAssignments,
  getStudentSubmissions,
  getStudentGroupsInfo,
  updateSubmissionStatus,
  saveQuizAnswers,
} from "@/helpers/teacherFetchers";
import type { Assignment, Submission, Group, QuizAnswerItem } from "@/type/teacher";

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
  const [openTabs, setOpenTabs] = useState<TabData[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tabQuizDone, setTabQuizDone] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<"all" | "todo" | "submitted" | "corrected">("all");

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
      // Tab already open → just activate it
      if (openTabs.some(t => t.assignment.id === a.id)) {
        setActiveTabId(a.id);
        return;
      }
      const sources = a.selectedExercises?.length
        ? a.selectedExercises
        : a.contentId
        ? [{ id: a.contentId, source: (a.contentSource ?? "exercises") as "exercises" | "teacherContent", title: a.title }]
        : [];

      if (sources.length === 0) {
        router.push(`/exercices`);
        return;
      }
      // Open a loading tab immediately
      setOpenTabs(prev => [...prev, { assignment: a, exos: [], loading: true }]);
      setActiveTabId(a.id);
      const fetched: ExoData[] = [];
      for (const sel of sources) {
        const coll = sel.source === "teacherContent" ? "teacherContent" : "exercises";
        const snap = await getDoc(doc(db, coll, sel.id));
        if (snap.exists()) {
          const d = snap.data();
          fetched.push(
            sel.source === "teacherContent"
              ? { id: snap.id, title: d.title, statement_text: d.description || undefined, statement_files: d.fileUrl ? [d.fileUrl] : undefined }
              : ({ id: snap.id, ...d } as ExoData)
          );
        }
      }
      setOpenTabs(prev => prev.map(t => t.assignment.id === a.id ? { ...t, exos: fetched, loading: false } : t));
    } else if (a.type === "devoir") {
      router.push(`/eleve/devoir/${a.id}`);
    }
  };

  const closeTab = (assignmentId: string) => {
    setOpenTabs(prev => {
      const newTabs = prev.filter(t => t.assignment.id !== assignmentId);
      if (activeTabId === assignmentId) {
        setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].assignment.id : null);
      }
      return newTabs;
    });
  };

  const handleTabQuizSubmit = async (a: Assignment, answers: QuizAnswerItem[]) => {
    if (!userId) return;
    await saveQuizAnswers(a.id, userId, a.groupId, answers);
    await updateSubmissionStatus(a.id, userId, a.groupId, "submitted");
    setTabQuizDone(prev => ({ ...prev, [a.id]: true }));
    setSubmissionsMap(prev => ({
      ...prev,
      [a.id]: { ...(prev[a.id] || {}), assignmentId: a.id, studentId: userId, groupId: a.groupId, status: "submitted" } as Submission,
    }));
  };

  const renderMathText = (text: string) =>
    preprocessLatex(text)
      .split(/\n{2,}/)
      .filter(Boolean)
      .map((p, i) => (
        <div key={i} className="mb-2 text-sm leading-relaxed">
          <MathJax dynamic hideUntilTypeset="first">{p}</MathJax>
        </div>
      ));

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
    <>
    <div className={`min-h-screen bg-gray-50 ${openTabs.length > 0 ? "pb-[420px]" : ""}`}>
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
        {assignments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold mb-1">Aucun travail pour l'instant</p>
            <p className="text-gray-400 text-sm">Votre professeur n'a pas encore distribué de travaux.</p>
          </div>
        ) : (
          <section>
            {/* Filtres */}
            <div className="flex gap-2 flex-wrap mb-4">
              {([
                { id: "all", label: "Tous", count: assignments.length },
                { id: "todo", label: "À faire", count: todoItems.length },
                { id: "submitted", label: "Remis", count: assignments.filter(a => getStatus(a) === "submitted").length },
                { id: "corrected", label: "Corrigés", count: correctedItems.length },
              ] as const).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition border ${
                    activeFilter === f.id
                      ? "bg-teal-700 text-white border-teal-700"
                      : "bg-white text-gray-600 border-gray-200 hover:border-teal-400"
                  }`}
                >
                  {f.label}
                  {f.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      activeFilter === f.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                    }`}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="space-y-8">
              {grouped
                .map(({ group, items }) => ({
                  group,
                  items: items.filter((a) => {
                    const s = getStatus(a);
                    if (activeFilter === "todo") return s === "not_started" || s === "in_progress";
                    if (activeFilter === "submitted") return s === "submitted";
                    if (activeFilter === "corrected") return s === "corrected";
                    return true;
                  }),
                }))
                .filter(({ items }) => items.length > 0)
                .map(({ group, items }) => (
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

    {/* ── Onglets exercices (panel fixe en bas) ── */}
    {openTabs.length > 0 && (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl flex flex-col" style={{ maxHeight: "420px" }}>
        {/* Barre d'onglets */}
        <div className="flex items-center gap-0 overflow-x-auto bg-gray-50 border-b border-gray-200 flex-shrink-0 px-1 pt-1">
          {openTabs.map(tab => (
            <div
              key={tab.assignment.id}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium flex-shrink-0 border border-b-0 transition ${
                activeTabId === tab.assignment.id
                  ? "bg-white text-teal-700 border-gray-200 -mb-px"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 border-transparent cursor-pointer"
              }`}
            >
              <button type="button" onClick={() => setActiveTabId(tab.assignment.id)} className="truncate max-w-[150px] text-left">
                {tab.assignment.title}
              </button>
              <button type="button" title="Fermer" onClick={() => closeTab(tab.assignment.id)} className="flex-shrink-0 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200 p-0.5 transition">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Contenu de l'onglet actif */}
        {openTabs.map(tab => tab.assignment.id !== activeTabId ? null : (
          <div key={tab.assignment.id} className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
            {tab.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-teal-700" />
              </div>
            ) : (
              <>
                {/* Consignes */}
                {tab.assignment.instructions && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Consignes
                    </p>
                    <p className="text-sm text-amber-700 whitespace-pre-wrap">{tab.assignment.instructions}</p>
                  </div>
                )}

                {/* Fichier joint par le prof */}
                {tab.assignment.fileUrl && (
                  <a href={tab.assignment.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-sm text-blue-700 font-medium hover:bg-blue-100 transition">
                    <Download className="w-4 h-4 flex-shrink-0" />
                    {tab.assignment.fileName || "Fichier du professeur"}
                  </a>
                )}

                {/* Exercices */}
                {tab.exos.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Contenu non disponible.</p>
                )}
                {tab.exos.map((exo, idx) => (
                  <div key={exo.id} className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="bg-teal-700 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-white uppercase tracking-widest">
                        {tab.exos.length > 1 ? `Exercice ${idx + 1}` : "Exercice"}
                        {exo.title && <span className="font-normal text-teal-200 ml-1.5">— {exo.title}</span>}
                      </span>
                      {exo.difficulty && (
                        <span className="text-xs text-white bg-white/20 px-2 py-0.5 rounded-full">{exo.difficulty}</span>
                      )}
                    </div>
                    <div className="px-4 py-3 bg-white space-y-2">
                      {exo.statement_text && renderMathText(exo.statement_text)}
                      {(exo.statement_files?.filter(Boolean).length ?? 0) > 0 && (
                        <div className="space-y-2 mt-2">
                          {exo.statement_files!.filter(Boolean).map((url, i) => {
                            const isImg = /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
                            return isImg ? (
                              <img key={i} src={url} alt={`Illustration ${i + 1}`} className="max-w-full rounded-lg border border-gray-200" />
                            ) : (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-700 hover:bg-blue-100 transition">
                                <Download className="w-4 h-4 flex-shrink-0" /> PDF {i + 1}
                              </a>
                            );
                          })}
                        </div>
                      )}
                      {!exo.statement_text && !exo.statement_files?.length && (
                        <p className="text-xs text-gray-400 italic">Aucun contenu.</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Quiz de l'assignation */}
                {(tab.assignment.questions?.length ?? 0) > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <QuizPlayerEleve
                      questions={tab.assignment.questions!}
                      existingAnswers={submissionsMap[tab.assignment.id]?.quizAnswers}
                      submitted={tabQuizDone[tab.assignment.id] || submissionsMap[tab.assignment.id]?.status === "submitted" || submissionsMap[tab.assignment.id]?.status === "corrected"}
                      onSubmit={(answers) => handleTabQuizSubmit(tab.assignment, answers)}
                    />
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="flex gap-2 pb-2">
                  {getStatus(tab.assignment) === "in_progress" && !tabQuizDone[tab.assignment.id] && (tab.assignment.questions?.length ?? 0) === 0 && (
                    <button type="button"
                      disabled={markingDone === tab.assignment.id}
                      onClick={async (e) => { await handleMarkDone(e, tab.assignment); closeTab(tab.assignment.id); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-teal-700 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-teal-800 disabled:opacity-50 transition">
                      {markingDone === tab.assignment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      J'ai terminé
                    </button>
                  )}
                  <button type="button" onClick={() => router.push("/exercices")}
                    className="flex items-center justify-center gap-1.5 text-teal-700 border border-teal-200 text-sm px-4 py-2.5 rounded-xl hover:bg-teal-50 transition flex-shrink-0">
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Tous les exercices</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    )}
    </>
  );
}

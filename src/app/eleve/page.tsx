"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { MathJax } from "better-react-mathjax";
import { preprocessLatex } from "@/components/admin/utils/latexUtils";
import QuizPlayerEleve from "@/components/teacher/QuizPlayerEleve";
import FileUploadZone from "@/components/teacher/FileUploadZone";
import { storagePaths } from "@/helpers/storageHelpers";
import {
  BookOpen, FileText, ClipboardList, Clock, Loader2, ChevronRight,
  Check, AlertCircle, ExternalLink, Star, AlertTriangle, X, Download,
  ChevronLeft, LayoutDashboard, Folder, Send, Trophy, Menu, Eye,
} from "lucide-react";
import {
  getStudentAssignments,
  getStudentSubmissions,
  updateSubmissionStatus,
  saveQuizAnswers,
  getOrCreateSubmission,
  submitWork,
} from "@/helpers/teacherFetchers";
import type { Assignment, Submission, QuizAnswerItem } from "@/type/teacher";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ExoData {
  id: string;
  title?: string;
  statement_text?: string;
  statement_files?: string[];
  difficulty?: string;
}

type SystemTabId = "dashboard" | "travaux" | "soumissions" | "resultats";
type TabId = SystemTabId | string;

interface TabDef {
  id: TabId;
  label: string;
  type: SystemTabId | "work";
  assignmentId?: string;
  closable: boolean;
}

type DrillLevel = "types" | "teachers" | "tasks";
type AssignType = "exercise" | "devoir" | "course";

interface DrillState {
  level: DrillLevel;
  selectedType?: AssignType;
  selectedTeacherId?: string;
}

interface WorkTabData {
  exos?: ExoData[];
  loadingExos?: boolean;
  quizDone?: boolean;
  submission?: Submission;
  text?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  teacherFileUrl?: string | null;
  teacherFileName?: string | null;
  submitting?: boolean;
  submitted?: boolean;
  loadingSubmission?: boolean;
  initialized?: boolean;
}

const STORAGE_KEY = "rosaine_eleve_v3";

const TYPE_LABELS: Record<string, string> = {
  course: "Cours", exercise: "Exercices", devoir: "Devoirs",
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
  course: <BookOpen className="w-4 h-4" />,
  exercise: <FileText className="w-4 h-4" />,
  devoir: <ClipboardList className="w-4 h-4" />,
};
const STATUS_LABELS: Record<string, string> = {
  not_started: "Non commencé", in_progress: "En cours",
  submitted: "Remis", corrected: "Corrigé",
};
const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-500",
  in_progress: "bg-blue-100 text-blue-700",
  submitted: "bg-amber-100 text-amber-700",
  corrected: "bg-green-100 text-green-700",
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function EleveDashboard() {
  const router = useRouter();

  // Data
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, Submission>>({});
  const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});

  // Tabs
  const [openTabs, setOpenTabs] = useState<TabDef[]>([
    { id: "dashboard", label: "Dashboard", type: "dashboard", closable: false },
  ]);
  const [activeTabId, setActiveTabId] = useState<TabId>("dashboard");

  // Drill-down state per nav tab
  const [drillStates, setDrillStates] = useState<Record<string, DrillState>>({
    travaux: { level: "types" },
    soumissions: { level: "types" },
    resultats: { level: "types" },
  });

  // Work tab data keyed by tabId
  const [workTabData, setWorkTabData] = useState<Record<string, WorkTabData>>({});

  // UI
  const [markingDone, setMarkingDone] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── localStorage restore ────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const s = JSON.parse(saved);
      if (Array.isArray(s.openTabs) && s.openTabs.length > 0) setOpenTabs(s.openTabs);
      if (s.activeTabId) setActiveTabId(s.activeTabId);
      if (s.drillStates) setDrillStates(s.drillStates);
    } catch {}
  }, []);

  // ── localStorage save ───────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ openTabs, activeTabId, drillStates }));
    } catch {}
  }, [openTabs, activeTabId, drillStates, loading]);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }
      setUserId(user.uid);

      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setStudentName(d.prenom || d.nom || "");
      }

      const [assignList, subList] = await Promise.all([
        getStudentAssignments(user.uid),
        getStudentSubmissions(user.uid),
      ]);

      setAssignments(assignList);

      const map: Record<string, Submission> = {};
      subList.forEach(s => { map[s.assignmentId] = s; });
      setSubmissionsMap(map);

      // Fetch teacher names
      const teacherIds = [...new Set(assignList.map(a => a.teacherId).filter(Boolean))];
      if (teacherIds.length > 0) {
        const snaps = await Promise.all(teacherIds.map(id => getDoc(doc(db, "users", id))));
        const tMap: Record<string, string> = {};
        snaps.forEach((s, i) => {
          if (s.exists()) {
            const d = s.data();
            tMap[teacherIds[i]] = `${d.prenom || ""} ${d.nom || ""}`.trim() || "Professeur";
          } else {
            tMap[teacherIds[i]] = "Professeur";
          }
        });
        setTeacherMap(tMap);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getStatus = (a: Assignment) => submissionsMap[a.id]?.status || "not_started";

  const renderMathText = (text: string) =>
    preprocessLatex(text).split(/\n{2,}/).filter(Boolean).map((p, i) => (
      <div key={i} className="mb-2 text-sm leading-relaxed">
        <MathJax dynamic hideUntilTypeset="first">{p}</MathJax>
      </div>
    ));

  // ── Tab management ──────────────────────────────────────────────────────────
  const openSystemTab = (id: SystemTabId, label: string) => {
    setOpenTabs(prev => prev.some(t => t.id === id) ? prev : [...prev, { id, label, type: id, closable: true }]);
    setActiveTabId(id);
    setSidebarOpen(false);
  };

  const openWorkTab = async (a: Assignment) => {
    if (a.type === "course") {
      if (a.contentId) window.open(`/courses/${a.contentId}`, "_blank");
      return;
    }
    const tabId = `work-${a.id}`;
    const isNew = !openTabs.some(t => t.id === tabId);
    if (isNew) {
      setOpenTabs(prev => [...prev, { id: tabId, label: a.title, type: "work", assignmentId: a.id, closable: true }]);
    }
    setActiveTabId(tabId);
    if (isNew) initWorkTab(a, tabId);
  };

  const closeTab = (tabId: TabId) => {
    setOpenTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId);
      const next = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(next[Math.max(0, idx - 1)]?.id || "dashboard");
      }
      return next;
    });
  };

  const setDrill = (tab: string, patch: Partial<DrillState>) =>
    setDrillStates(prev => ({ ...prev, [tab]: { ...prev[tab], ...patch } }));

  const updateWork = (tabId: string, patch: Partial<WorkTabData>) =>
    setWorkTabData(prev => ({ ...prev, [tabId]: { ...prev[tabId], ...patch } }));

  // ── Work tab initialization ─────────────────────────────────────────────────
  const initWorkTab = async (a: Assignment, tabId: string) => {
    if (!userId) return;
    updateWork(tabId, { initialized: true });

    if (a.type === "exercise") {
      updateWork(tabId, { loadingExos: true });
      const sources = a.selectedExercises?.length
        ? a.selectedExercises
        : a.contentId
          ? [{ id: a.contentId, source: (a.contentSource ?? "exercises") as "exercises" | "teacherContent", title: a.title }]
          : [];
      const fetched: ExoData[] = [];
      for (const sel of sources) {
        const snap = await getDoc(doc(db, sel.source === "teacherContent" ? "teacherContent" : "exercises", sel.id));
        if (snap.exists()) {
          const d = snap.data();
          fetched.push(sel.source === "teacherContent"
            ? { id: snap.id, title: d.title, statement_text: d.description || undefined, statement_files: d.fileUrl ? [d.fileUrl] : undefined }
            : { id: snap.id, ...d } as ExoData
          );
        }
      }
      updateWork(tabId, { exos: fetched, loadingExos: false });
      const currentStatus = submissionsMap[a.id]?.status;
      if (!currentStatus || currentStatus === "not_started") {
        await updateSubmissionStatus(a.id, userId, a.groupId, "in_progress");
        setSubmissionsMap(prev => ({
          ...prev,
          [a.id]: { ...(prev[a.id] || {}), assignmentId: a.id, studentId: userId, groupId: a.groupId, status: "in_progress" } as Submission,
        }));
      }
    } else if (a.type === "devoir") {
      updateWork(tabId, { loadingSubmission: true });
      const sub = await getOrCreateSubmission(a.id, userId, a.groupId);
      let teacherFileUrl: string | null = null;
      let teacherFileName: string | null = null;
      if (a.fileUrl) {
        teacherFileUrl = a.fileUrl;
        teacherFileName = a.fileName || "Fichier du professeur";
      } else if (a.contentId) {
        const cs = await getDoc(doc(db, "teacherContent", a.contentId));
        if (cs.exists() && cs.data().fileUrl) {
          teacherFileUrl = cs.data().fileUrl;
          teacherFileName = cs.data().fileName || "Fichier";
        }
      }
      updateWork(tabId, {
        submission: sub,
        text: sub.textContent || "",
        fileUrl: (sub as any).fileUrl || null,
        fileName: (sub as any).fileName || null,
        teacherFileUrl,
        teacherFileName,
        submitted: sub.status === "submitted" || sub.status === "corrected",
        quizDone: !!(sub.quizAnswers?.length),
        loadingSubmission: false,
      });
    }
  };

  // ── Submit handlers ─────────────────────────────────────────────────────────
  const handleDevoirSubmit = async (a: Assignment, tabId: string) => {
    if (!userId) return;
    const d = workTabData[tabId];
    if (!d) return;
    updateWork(tabId, { submitting: true });
    await submitWork(a.id, userId, (d.text || "").trim(), undefined, d.fileUrl || undefined, d.fileName || undefined);
    setSubmissionsMap(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || {}), status: "submitted" } as Submission }));
    updateWork(tabId, { submitting: false, submitted: true });
  };

  const handleExoQuizSubmit = async (a: Assignment, tabId: string, answers: QuizAnswerItem[]) => {
    if (!userId) return;
    await saveQuizAnswers(a.id, userId, a.groupId, answers);
    await updateSubmissionStatus(a.id, userId, a.groupId, "submitted");
    setSubmissionsMap(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || {}), status: "submitted" } as Submission }));
    updateWork(tabId, { quizDone: true });
  };

  const handleMarkDone = async (a: Assignment, tabId: string) => {
    if (!userId) return;
    setMarkingDone(a.id);
    await updateSubmissionStatus(a.id, userId, a.groupId, "submitted");
    setSubmissionsMap(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || {}), status: "submitted" } as Submission }));
    setMarkingDone(null);
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-7 h-7 animate-spin text-teal-700" />
      </div>
    );
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const now = new Date();
  const todoItems = assignments.filter(a => { const s = getStatus(a); return s === "not_started" || s === "in_progress"; });
  const correctedItems = assignments.filter(a => getStatus(a) === "corrected");
  const urgentItems = assignments.filter(a => {
    if (!a.deadline) return false;
    const s = getStatus(a);
    if (s === "submitted" || s === "corrected") return false;
    const dl = new Date((a.deadline as any)?.toDate?.() || a.deadline);
    return (dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 3;
  });

  // ── Render: Dashboard ───────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Bonjour{studentName ? `, ${studentName}` : ""}</h1>
        <p className="text-gray-500 text-sm mt-1">Vos cours, devoirs et résultats</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-teal-50 rounded-2xl p-4">
          <p className="text-2xl font-bold text-teal-700">{assignments.length}</p>
          <p className="text-xs text-gray-600">Travaux</p>
        </div>
        <div className={`rounded-2xl p-4 ${todoItems.length > 0 ? "bg-blue-50" : "bg-gray-50"}`}>
          <p className={`text-2xl font-bold ${todoItems.length > 0 ? "text-blue-600" : "text-gray-400"}`}>{todoItems.length}</p>
          <p className="text-xs text-gray-600">À faire</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4">
          <p className="text-2xl font-bold text-amber-600">{assignments.filter(a => getStatus(a) === "submitted").length}</p>
          <p className="text-xs text-gray-600">En attente</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4">
          <p className="text-2xl font-bold text-green-600">{correctedItems.length}</p>
          <p className="text-xs text-gray-600">Corrigés</p>
        </div>
      </div>

      {/* Urgent */}
      {urgentItems.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-600 uppercase tracking-widest">Urgent</h2>
          </div>
          <div className="space-y-2">
            {urgentItems.map(a => {
              const dl = new Date((a.deadline as any)?.toDate?.() || a.deadline);
              const diffH = Math.max(0, Math.round((dl.getTime() - now.getTime()) / (1000 * 60 * 60)));
              return (
                <div key={a.id} onClick={() => openWorkTab(a)}
                  className="bg-white border border-red-100 rounded-2xl px-5 py-3 flex items-center justify-between cursor-pointer hover:shadow-sm transition group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{a.title}</p>
                      <p className="text-xs text-red-500 font-medium">
                        {diffH < 24 ? `${diffH}h restante${diffH !== 1 ? "s" : ""}` : `${Math.ceil(diffH / 24)}j restant${Math.ceil(diffH / 24) !== 1 ? "s" : ""}`}
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

      {/* Corrections */}
      {correctedItems.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-widest">Mes notes</h2>
          </div>
          <div className="space-y-2">
            {correctedItems.map(a => {
              const sub = submissionsMap[a.id];
              return (
                <div key={a.id} onClick={() => openWorkTab(a)}
                  className="bg-white border border-green-100 rounded-2xl p-4 cursor-pointer hover:shadow-sm transition">
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

      {assignments.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold mb-1">Aucun travail pour l'instant</p>
          <p className="text-gray-400 text-sm">Votre professeur n'a pas encore distribué de travaux.</p>
        </div>
      )}
    </div>
  );

  // ── Render: Drill tab ───────────────────────────────────────────────────────
  const renderDrill = (tabType: "travaux" | "soumissions" | "resultats") => {
    const drill = drillStates[tabType] || { level: "types" };

    let filtered = assignments;
    if (tabType === "resultats") filtered = assignments.filter(a => getStatus(a) === "corrected");
    if (tabType === "soumissions") filtered = assignments.filter(a => {
      const s = getStatus(a);
      return s === "submitted" || s === "corrected";
    });

    // Level 1 — Types
    if (drill.level === "types") {
      const types: AssignType[] = ["exercise", "devoir", "course"];
      return (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
            {tabType === "travaux" ? "Mes travaux" : tabType === "soumissions" ? "Mes soumissions" : "Mes résultats"}
          </h2>
          {types.map(type => {
            const count = filtered.filter(a => a.type === type).length;
            if (tabType !== "travaux" && count === 0) return null;
            return (
              <button key={type} type="button"
                onClick={() => setDrill(tabType, { level: "teachers", selectedType: type })}
                className="w-full flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-5 py-4 hover:shadow-sm hover:border-teal-200 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
                    {TYPE_ICONS[type]}
                  </div>
                  <span className="font-medium text-gray-800">{TYPE_LABELS[type]}</span>
                </div>
                <div className="flex items-center gap-2">
                  {count > 0 && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">{count}</span>}
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition" />
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    // Level 2 — Teachers
    if (drill.level === "teachers" && drill.selectedType) {
      const typeAssignments = filtered.filter(a => a.type === drill.selectedType);
      const teacherIds = [...new Set(typeAssignments.map(a => a.teacherId))];
      return (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
          {/* Breadcrumb */}
          <button type="button" onClick={() => setDrill(tabType, { level: "types" })}
            className="flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 mb-5 transition">
            <ChevronLeft className="w-4 h-4" /> {TYPE_LABELS[drill.selectedType]}
          </button>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Professeurs</h2>
          {teacherIds.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Aucun résultat</p>
          )}
          {teacherIds.map(tid => {
            const count = typeAssignments.filter(a => a.teacherId === tid).length;
            const name = teacherMap[tid] || "Professeur";
            return (
              <button key={tid} type="button"
                onClick={() => setDrill(tabType, { level: "tasks", selectedTeacherId: tid })}
                className="w-full flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-5 py-4 hover:shadow-sm hover:border-teal-200 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-teal-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-800">{name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{count}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition" />
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    // Level 3 — Tasks
    if (drill.level === "tasks" && drill.selectedType && drill.selectedTeacherId) {
      const tasks = filtered.filter(a => a.type === drill.selectedType && a.teacherId === drill.selectedTeacherId);
      const teacherName = teacherMap[drill.selectedTeacherId] || "Professeur";
      return (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm mb-5 flex-wrap">
            <button type="button" onClick={() => setDrill(tabType, { level: "types" })}
              className="text-teal-700 hover:text-teal-900 transition">
              {TYPE_LABELS[drill.selectedType]}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <button type="button" onClick={() => setDrill(tabType, { level: "teachers", selectedType: drill.selectedType })}
              className="text-teal-700 hover:text-teal-900 transition">
              {teacherName}
            </button>
          </div>
          {tasks.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Aucun travail</p>}
          {tasks.map(a => {
            const status = getStatus(a);
            const sub = submissionsMap[a.id];
            return (
              <div key={a.id} className="bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{a.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                      {a.deadline && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {new Date((a.deadline as any)?.toDate?.() || a.deadline).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>
                    {tabType === "resultats" && sub?.grade !== undefined && (
                      <p className="mt-1.5 font-bold text-green-700">{sub.grade}/20</p>
                    )}
                    {tabType === "resultats" && sub?.feedback && (
                      <p className="text-xs text-gray-500 italic mt-0.5">"{sub.feedback}"</p>
                    )}
                    {tabType === "soumissions" && sub?.textContent && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 italic">"{sub.textContent}"</p>
                    )}
                  </div>
                  {a.type === "course" ? (
                    <a href={a.contentId ? `/courses/${a.contentId}` : "#"} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-teal-700 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-teal-800 transition flex-shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" /> Ouvrir
                    </a>
                  ) : (
                    <button type="button" onClick={() => openWorkTab(a)}
                      className="flex items-center gap-1.5 bg-teal-700 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-teal-800 transition flex-shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" /> Ouvrir
                    </button>
                  )}
                </div>
                {a.instructions && (
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500">{a.instructions}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  };

  // ── Render: Work tab ────────────────────────────────────────────────────────
  const renderWorkTab = (tab: TabDef) => {
    if (!tab.assignmentId) return null;
    const a = assignments.find(x => x.id === tab.assignmentId);
    if (!a) return <div className="p-8 text-sm text-gray-400 text-center">Travail introuvable.</div>;

    const tabId = tab.id as string;
    const data = workTabData[tabId] || {};

    // Auto-init if tab was restored from localStorage
    if (!data.initialized && userId) {
      initWorkTab(a, tabId);
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
        </div>
      );
    }

    const status = getStatus(a);

    const tabHeader = (
      <div className="bg-teal-700 text-white px-6 py-5 flex-shrink-0">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            {TYPE_ICONS[a.type]}
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">{a.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-teal-200 text-xs">{TYPE_LABELS[a.type]}</span>
              {a.deadline && (
                <span className="flex items-center gap-1 text-xs text-teal-300">
                  <Clock className="w-3 h-3" />
                  {new Date((a.deadline as any)?.toDate?.() || a.deadline).toLocaleDateString("fr-FR")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );

    // ── Exercise ──
    if (a.type === "exercise") {
      return (
        <div>
          {tabHeader}
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
            {a.instructions && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Consignes
                </p>
                <p className="text-sm text-amber-700 whitespace-pre-wrap">{a.instructions}</p>
              </div>
            )}
            {a.fileUrl && (
              <a href={a.fileUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-sm text-blue-700 font-medium hover:bg-blue-100 transition">
                <Download className="w-4 h-4 flex-shrink-0" />
                {a.fileName || "Fichier du professeur"}
              </a>
            )}
            {data.loadingExos && (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-teal-700" /></div>
            )}
            {!data.loadingExos && (data.exos || []).map((exo, idx) => (
              <div key={exo.id} className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="bg-teal-700 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white uppercase tracking-widest">
                    {(data.exos || []).length > 1 ? `Exercice ${idx + 1}` : "Exercice"}
                    {exo.title && <span className="font-normal text-teal-200 ml-1.5">— {exo.title}</span>}
                  </span>
                  {exo.difficulty && (
                    <span className="text-xs text-white bg-white/20 px-2 py-0.5 rounded-full">{exo.difficulty}</span>
                  )}
                </div>
                <div className="px-5 py-4 bg-white space-y-2">
                  {exo.statement_text && renderMathText(exo.statement_text)}
                  {exo.statement_files?.filter(Boolean).map((url, i) => {
                    const isImg = /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
                    return isImg
                      ? <img key={i} src={url} alt={`Illustration ${i + 1}`} className="max-w-full rounded-lg border border-gray-100 mt-2" />
                      : (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-sm text-blue-700 hover:bg-blue-100 transition mt-2">
                          <Download className="w-4 h-4 flex-shrink-0" /> PDF {i + 1}
                        </a>
                      );
                  })}
                  {!exo.statement_text && !(exo.statement_files?.filter(Boolean).length) && (
                    <p className="text-xs text-gray-400 italic">Aucun contenu.</p>
                  )}
                </div>
              </div>
            ))}
            {!data.loadingExos && (a.questions?.length ?? 0) > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <QuizPlayerEleve
                  questions={a.questions!}
                  existingAnswers={submissionsMap[a.id]?.quizAnswers}
                  submitted={data.quizDone || status === "submitted" || status === "corrected"}
                  onSubmit={answers => handleExoQuizSubmit(a, tabId, answers)}
                />
              </div>
            )}
            {!data.loadingExos && status === "in_progress" && !data.quizDone && !(a.questions?.length) && (
              <button type="button" disabled={markingDone === a.id}
                onClick={() => handleMarkDone(a, tabId)}
                className="w-full flex items-center justify-center gap-2 bg-teal-700 text-white text-sm font-semibold py-3 rounded-xl hover:bg-teal-800 disabled:opacity-50 transition">
                {markingDone === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                J'ai terminé cet exercice
              </button>
            )}
            {(status === "submitted" || status === "corrected") && (
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-700 font-medium">Exercice terminé</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── Devoir ──
    if (a.type === "devoir") {
      const sub = data.submission || submissionsMap[a.id];
      const isCorrected = sub?.status === "corrected";
      const isSubmitted = data.submitted || sub?.status === "submitted";
      const canEdit = !isSubmitted && !isCorrected;

      return (
        <div>
          {tabHeader}
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
            {data.loadingSubmission ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-teal-700" /></div>
            ) : (
              <>
                {a.instructions && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800 mb-1">Consignes</p>
                        <p className="text-sm text-amber-700 whitespace-pre-wrap">{a.instructions}</p>
                      </div>
                    </div>
                  </div>
                )}
                {data.teacherFileUrl && (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Eye className="w-4 h-4 text-blue-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-blue-600 font-medium">Document du professeur</p>
                      <p className="text-sm text-blue-800 font-semibold truncate">{data.teacherFileName}</p>
                    </div>
                    <a href={data.teacherFileUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 font-medium bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-300 transition flex-shrink-0">
                      Ouvrir
                    </a>
                  </div>
                )}
                {isCorrected && sub && (
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Check className="w-5 h-5 text-green-600" />
                      <p className="font-semibold text-green-800">Corrigé par votre professeur</p>
                    </div>
                    {sub.grade !== undefined && (
                      <div className="text-4xl font-bold text-green-700 mb-2">
                        {sub.grade}<span className="text-xl text-green-500">/20</span>
                      </div>
                    )}
                    {sub.feedback && (
                      <p className="text-sm text-green-800 italic bg-white rounded-lg px-3 py-2 border border-green-100">
                        "{sub.feedback}"
                      </p>
                    )}
                  </div>
                )}
                {isSubmitted && !isCorrected && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
                    <Check className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Devoir soumis</p>
                      <p className="text-xs text-amber-700">En attente de correction.</p>
                    </div>
                  </div>
                )}
                {(a.questions?.length ?? 0) > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <QuizPlayerEleve
                      questions={a.questions!}
                      existingAnswers={sub?.quizAnswers}
                      submitted={data.quizDone || isSubmitted || isCorrected}
                      onSubmit={async answers => {
                        if (!userId) return;
                        await saveQuizAnswers(a.id, userId, a.groupId, answers);
                        updateWork(tabId, { quizDone: true });
                      }}
                    />
                  </div>
                )}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <label className="text-sm font-semibold text-gray-700 mb-3 block">
                    {canEdit ? "Rédigez votre réponse" : "Votre réponse"}
                  </label>
                  <textarea
                    value={data.text || ""}
                    onChange={e => updateWork(tabId, { text: e.target.value })}
                    disabled={!canEdit}
                    rows={8}
                    placeholder="Rédigez votre devoir ici…"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 resize-none disabled:bg-gray-50 disabled:text-gray-600 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">{(data.text || "").length} caractère(s)</p>
                </div>
                {canEdit && userId && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <FileUploadZone
                      storagePath={storagePaths.submission(userId, a.id, "")}
                      accept="pdfAndImages"
                      label="Joindre un fichier (optionnel)"
                      initialUrl={data.fileUrl || undefined}
                      initialName={data.fileName || undefined}
                      onUploadComplete={(url, name) => updateWork(tabId, { fileUrl: url, fileName: name })}
                      onRemove={() => updateWork(tabId, { fileUrl: null, fileName: null })}
                    />
                  </div>
                )}
                {!canEdit && data.fileUrl && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                    <p className="text-sm text-gray-600 flex-1">Fichier joint :</p>
                    <a href={data.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition">
                      <Eye className="w-4 h-4" /> {data.fileName || "Voir le fichier"}
                    </a>
                  </div>
                )}
                {canEdit && (
                  <button type="button"
                    onClick={() => handleDevoirSubmit(a, tabId)}
                    disabled={data.submitting || (!(data.text?.trim()) && !data.fileUrl)}
                    className="w-full bg-teal-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-800 disabled:opacity-50 flex items-center justify-center gap-2 transition">
                    {data.submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Soumettre le devoir
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // ── Nav items ───────────────────────────────────────────────────────────────
  const navItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "travaux" as const, label: "Travaux", icon: <Folder className="w-4 h-4" /> },
    { id: "soumissions" as const, label: "Soumissions", icon: <Send className="w-4 h-4" /> },
    { id: "resultats" as const, label: "Résultats", icon: <Trophy className="w-4 h-4" /> },
  ];

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static z-50 md:z-auto h-full
        w-56 bg-teal-800 text-white flex flex-col flex-shrink-0
        transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="px-4 py-5 border-b border-teal-700">
          <p className="font-bold text-white text-sm">Mon espace</p>
          <p className="text-teal-300 text-xs mt-0.5 truncate">{studentName || "Élève"}</p>
        </div>
        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {navItems.map(item => (
            <button key={item.id} type="button"
              onClick={() => {
                if (item.id === "dashboard") {
                  setActiveTabId("dashboard");
                  setSidebarOpen(false);
                } else {
                  openSystemTab(item.id, item.label);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTabId === item.id
                  ? "bg-white/20 text-white"
                  : "text-teal-200 hover:bg-white/10 hover:text-white"
              }`}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-teal-700">
          <p className="text-xs text-teal-400">{assignments.length} travaux au total</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Tab bar */}
        <div className="bg-white border-b border-gray-200 flex items-center flex-shrink-0">
          {/* Mobile hamburger */}
          <button type="button" title="Menu" className="md:hidden px-3 py-2 text-gray-500 hover:text-gray-700 flex-shrink-0"
            onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-end overflow-x-auto flex-1 min-w-0 pl-1 pt-1">
            {openTabs.map(tab => (
              <div key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium flex-shrink-0 cursor-pointer border border-b-0 rounded-t-lg transition select-none ${
                  activeTabId === tab.id
                    ? "bg-white text-teal-700 border-gray-200 -mb-px z-10"
                    : "bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100 hover:text-gray-700"
                }`}>
                <span className="truncate max-w-[120px]">{tab.label}</span>
                {tab.closable && (
                  <button type="button" title="Fermer"
                    onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-700 p-0.5 rounded hover:bg-gray-200 transition">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {activeTabId === "dashboard" && renderDashboard()}
          {activeTabId === "travaux" && renderDrill("travaux")}
          {activeTabId === "soumissions" && renderDrill("soumissions")}
          {activeTabId === "resultats" && renderDrill("resultats")}
          {openTabs
            .filter(t => t.type === "work" && activeTabId === t.id)
            .map(tab => <div key={tab.id}>{renderWorkTab(tab)}</div>)
          }
        </div>
      </div>
    </div>
  );
}

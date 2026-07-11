"use client";

import { useEffect, useState, useCallback } from "react";
import { auth, db } from "@/firebase";
import { collection, getDocs, doc, getDoc, query, where, documentId } from "firebase/firestore";
import {
  LayoutDashboard, Briefcase, Users, ClipboardCheck, Library,
  Plus, X, ChevronRight, ChevronLeft, Loader2, Check, Trash2, Pencil,
  BookOpen, FileText, ClipboardList, Clock, AlertTriangle,
  Eye, ChevronDown, ChevronUp, Menu, Search,
} from "lucide-react";
import ProtectTeacherRoute from "@/components/auth/ProtectTeacherRoute";
import QuizBuilder from "@/components/teacher/QuizBuilder";
import FileUploadZone from "@/components/teacher/FileUploadZone";
import { storagePaths } from "@/helpers/storageHelpers";
import {
  createGroup, deleteGroup, renameGroup,
  addStudentToGroup, removeStudentFromGroup, findUserByEmail,
  getTeacherAssignments, getTeacherSubmissions,
  createAssignment, deleteAssignment,
  saveCorrection,
  getTeacherContent, createTeacherContent, updateTeacherContent, deleteTeacherContent,
} from "@/helpers/teacherFetchers";
import type { Group, Assignment, Submission, TeacherContent, QuizQuestion, SelectedExercise } from "@/type/teacher";

// ── Types ──────────────────────────────────────────────────────────────────────
interface StudentInfo { uid: string; nom: string; prenom: string; email: string; }
type SystemTabId = "dashboard" | "travaux" | "groupes" | "corrections" | "bibliotheque";
type TabId = SystemTabId | `group-${string}`;
interface GroupTab { id: `group-${string}`; label: string; groupId: string; }
type TravauxLevel = "types" | "assignments";
interface TravauxDrill { level: TravauxLevel; type?: "course" | "exercise" | "devoir"; }
type CorrectionsLevel = "groups" | "copies";
interface CorrectionsDrill { level: CorrectionsLevel; groupId?: string; }
type ContentType = "cours" | "devoir" | "exercise";

const STORAGE_KEY = "rosaine_teacher_v1";

const TYPE_LABELS: Record<string, string> = { course: "Cours", exercise: "Exercice", devoir: "Devoir" };
const TYPE_ICONS: Record<string, React.ReactNode> = {
  course: <BookOpen className="w-4 h-4" />,
  exercise: <FileText className="w-4 h-4" />,
  devoir: <ClipboardList className="w-4 h-4" />,
};
const LIB_LABELS: Record<ContentType, string> = { cours: "Cours", devoir: "Devoir", exercise: "Exercice" };
const LIB_ICONS: Record<ContentType, React.ReactNode> = {
  cours: <BookOpen className="w-4 h-4" />,
  devoir: <ClipboardList className="w-4 h-4" />,
  exercise: <FileText className="w-4 h-4" />,
};
const STATUS_LABELS: Record<string, string> = {
  not_started: "Non commencé", in_progress: "En cours",
  submitted: "Soumis", corrected: "Corrigé",
};
const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-500", in_progress: "bg-blue-100 text-blue-700",
  submitted: "bg-amber-100 text-amber-700", corrected: "bg-green-100 text-green-700",
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function TeacherPage() {
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [teacherContent, setTeacherContent] = useState<TeacherContent[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [studentMap, setStudentMap] = useState<Record<string, StudentInfo>>({});
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Tabs
  const [openGroupTabs, setOpenGroupTabs] = useState<GroupTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<TabId>("dashboard");

  // Drill
  const [travauxDrill, setTravauxDrill] = useState<TravauxDrill>({ level: "types" });
  const [correctionsDrill, setCorrectionsDrill] = useState<CorrectionsDrill>({ level: "groups" });
  const [groupSubtab, setGroupSubtab] = useState<Record<string, "travaux" | "eleves" | "corrections">>({});
  const [groupOpenAssignId, setGroupOpenAssignId] = useState<Record<string, string | null>>({});
  const [corrOpenAssignId, setCorrOpenAssignId] = useState<string | null>(null);

  // Group CRUD
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  // Student management per group
  const [addEmail, setAddEmail] = useState<Record<string, string>>({});
  const [addStatus, setAddStatus] = useState<Record<string, "idle" | "loading" | "ok" | "notfound" | "already">>({});

  // Assignment form
  const [showAssignForm, setShowAssignForm] = useState<string | null>(null);
  const [assignType, setAssignType] = useState<"course" | "exercise" | "devoir">("devoir");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignContentId, setAssignContentId] = useState("");
  const [assignDeadline, setAssignDeadline] = useState("");
  const [assignInstructions, setAssignInstructions] = useState("");
  const [assignQuestions, setAssignQuestions] = useState<QuizQuestion[]>([]);
  const [assignFileUrl, setAssignFileUrl] = useState<string | null>(null);
  const [assignFileName, setAssignFileName] = useState<string | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentInfo[]>([]);
  const [studentSearchQ, setStudentSearchQ] = useState("");
  const [studentSearchResult, setStudentSearchResult] = useState<StudentInfo | "not_found" | null>(null);
  const [selectedExos, setSelectedExos] = useState<SelectedExercise[]>([]);
  const [showExoPicker, setShowExoPicker] = useState(false);
  const [exoPickerTab, setExoPickerTab] = useState<"exercises" | "teacherContent">("teacherContent");
  const [exoSearch, setExoSearch] = useState("");
  const [exoSubjectFilter, setExoSubjectFilter] = useState("");
  const [exoCourseFilter, setExoCourseFilter] = useState("");
  const [savingAssign, setSavingAssign] = useState(false);

  // Corrections
  const [grades, setGrades] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [savingCorrection, setSavingCorrection] = useState<string | null>(null);

  // Library
  const [showLibForm, setShowLibForm] = useState(false);
  const [libEditingId, setLibEditingId] = useState<string | null>(null);
  const [libFormType, setLibFormType] = useState<ContentType>("cours");
  const [libFormTitle, setLibFormTitle] = useState("");
  const [libFormDesc, setLibFormDesc] = useState("");
  const [libFormQuestions, setLibFormQuestions] = useState<QuizQuestion[]>([]);
  const [libFormFileUrl, setLibFormFileUrl] = useState<string | null>(null);
  const [libFormFileName, setLibFormFileName] = useState<string | null>(null);
  const [libSaving, setLibSaving] = useState(false);
  const [libExpandedId, setLibExpandedId] = useState<string | null>(null);

  const [loaded, setLoaded] = useState(false);

  // ── localStorage restore ────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.openGroupTabs) setOpenGroupTabs(s.openGroupTabs);
        if (s.activeTabId) setActiveTabId(s.activeTabId);
        if (s.travauxDrill) setTravauxDrill(s.travauxDrill);
        if (s.correctionsDrill) setCorrectionsDrill(s.correctionsDrill);
        if (s.groupSubtab) setGroupSubtab(s.groupSubtab);
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        openGroupTabs, activeTabId, travauxDrill, correctionsDrill, groupSubtab,
      }));
    } catch {}
  }, [loaded, openGroupTabs, activeTabId, travauxDrill, correctionsDrill, groupSubtab]);

  // ── Auth + data load ────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      setTeacherId(user.uid);

      const [userSnap, grpSnap, libSnap, courseSnap, exoSnap, subjSnap] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDocs(query(collection(db, "groups"), where("teacherId", "==", user.uid))),
        getTeacherContent(user.uid),
        getDocs(collection(db, "courses")),
        getDocs(collection(db, "exercises")),
        getDocs(collection(db, "subjects")),
      ]);

      if (userSnap.exists()) {
        const d = userSnap.data();
        setTeacherName(d.prenom || d.nom || "");
      }

      const loadedGroups: Group[] = grpSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
      setGroups(loadedGroups);
      setTeacherContent(libSnap);
      setCourses(courseSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setExercises(exoSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setSubjects(subjSnap.docs.map((d) => ({ id: d.id, name: (d.data() as any).name || d.id })));

      const loadedAssignments = await getTeacherAssignments(user.uid);
      setAssignments(loadedAssignments);

      if (loadedAssignments.length > 0) {
        const subs = await getTeacherSubmissions(loadedAssignments.map((a) => a.id));
        setSubmissions(subs);
        const init: Record<string, { grade: string; feedback: string }> = {};
        subs.forEach((s) => {
          if (s.grade !== undefined || s.feedback) {
            init[`${s.studentId}_${s.assignmentId}`] = {
              grade: s.grade !== undefined ? String(s.grade) : "",
              feedback: s.feedback || "",
            };
          }
        });
        setGrades(init);
      }

      // Load student names
      const allStudentIds = [...new Set(loadedGroups.flatMap((g) => g.studentIds))];
      if (allStudentIds.length > 0) {
        const map: Record<string, StudentInfo> = {};
        for (let i = 0; i < allStudentIds.length; i += 30) {
          const snap = await getDocs(
            query(collection(db, "users"), where(documentId(), "in", allStudentIds.slice(i, i + 30)))
          );
          snap.docs.forEach((d) => {
            const data = d.data();
            map[d.id] = { uid: d.id, nom: data.nom || "", prenom: data.prenom || "", email: data.email || "" };
          });
        }
        setStudentMap(map);
      }

      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Tab helpers ─────────────────────────────────────────────────────────────
  const openGroupTab = useCallback((group: Group) => {
    const tabId = `group-${group.id}` as const;
    setOpenGroupTabs((prev) =>
      prev.find((t) => t.id === tabId) ? prev : [...prev, { id: tabId, label: group.name, groupId: group.id }]
    );
    setActiveTabId(tabId);
    setSidebarOpen(false);
  }, []);

  const closeGroupTab = useCallback((tabId: `group-${string}`) => {
    setOpenGroupTabs((prev) => prev.filter((t) => t.id !== tabId));
    setActiveTabId((cur) => (cur === tabId ? "groupes" : cur));
  }, []);

  const activateTab = (id: TabId) => {
    setActiveTabId(id);
    setSidebarOpen(false);
  };

  // ── Assignment form helpers ─────────────────────────────────────────────────
  const openAssignForm = (context: string, preGroupId?: string) => {
    setAssignType("devoir");
    setAssignTitle(""); setAssignContentId(""); setAssignDeadline("");
    setAssignInstructions(""); setAssignQuestions([]);
    setAssignFileUrl(null); setAssignFileName(null);
    setSelectedExos([]); setShowExoPicker(false);
    setExoSearch(""); setExoSubjectFilter(""); setExoCourseFilter("");
    setSelectedStudentIds([]); setSelectedStudents([]);
    setStudentSearchQ(""); setStudentSearchResult(null);
    setSelectedGroupIds(preGroupId ? [preGroupId] : []);
    setShowAssignForm(context);
  };

  const handleImportResource = (r: TeacherContent) => {
    const aType: "course" | "exercise" | "devoir" = r.type === "exercise" ? "exercise" : "devoir";
    setAssignType(aType);
    setAssignTitle(r.title);
    setAssignInstructions(r.description || "");
    setAssignQuestions(r.questions || []);
    if (aType === "exercise") {
      setSelectedExos((prev) =>
        prev.some((e) => e.id === r.id && e.source === "teacherContent")
          ? prev : [...prev, { id: r.id, source: "teacherContent", title: r.title }]
      );
    } else {
      setAssignContentId(r.id);
    }
  };

  const handleStudentSearch = async () => {
    if (!studentSearchQ.trim()) return;
    const found = await findUserByEmail(studentSearchQ.trim().toLowerCase());
    setStudentSearchResult(found || "not_found");
  };

  const addStudentToAssign = (s: StudentInfo) => {
    if (selectedStudentIds.includes(s.uid)) return;
    setSelectedStudentIds((prev) => [...prev, s.uid]);
    setSelectedStudents((prev) => [...prev, s]);
    setStudentSearchQ(""); setStudentSearchResult(null);
  };

  const handleCreateAssignment = async () => {
    if (!assignTitle.trim() || !teacherId) return;
    if (assignType === "course" && !assignContentId) return;
    if (assignType === "exercise" && selectedExos.length === 0) return;
    if (selectedGroupIds.length === 0 && selectedStudentIds.length === 0) return;
    setSavingAssign(true);

    const payload: Omit<Assignment, "id" | "createdAt"> = {
      title: assignTitle.trim(),
      teacherId,
      type: assignType,
      groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
      groupId: selectedGroupIds[0] || undefined,
      studentIds: selectedStudentIds.length > 0 ? selectedStudentIds : undefined,
      contentId: assignType !== "exercise" ? assignContentId || undefined : undefined,
      selectedExercises: assignType === "exercise" ? selectedExos : undefined,
      instructions: assignInstructions || undefined,
      deadline: assignDeadline ? new Date(assignDeadline) : undefined,
      questions: assignQuestions.length > 0 ? assignQuestions : undefined,
      fileUrl: assignFileUrl || undefined,
      fileName: assignFileName || undefined,
    };

    const id = await createAssignment(payload);
    setAssignments((prev) => [...prev, { ...payload, id, createdAt: null }]);
    setShowAssignForm(null);
    setSavingAssign(false);
  };

  const handleDeleteAssignment = async (aId: string) => {
    if (!confirm("Supprimer ce travail ?")) return;
    await deleteAssignment(aId);
    setAssignments((prev) => prev.filter((a) => a.id !== aId));
  };

  const handleSaveCorrection = async (assignmentId: string, studentId: string) => {
    const key = `${studentId}_${assignmentId}`;
    const g = grades[key] || { grade: "", feedback: "" };
    const gradeNum = parseFloat(g.grade);
    if (isNaN(gradeNum)) return;
    setSavingCorrection(key);
    await saveCorrection(assignmentId, studentId, gradeNum, g.feedback);
    setSubmissions((prev) => {
      const exists = prev.find((s) => s.assignmentId === assignmentId && s.studentId === studentId);
      if (exists) return prev.map((s) =>
        s.assignmentId === assignmentId && s.studentId === studentId
          ? { ...s, grade: gradeNum, feedback: g.feedback, status: "corrected" as const } : s
      );
      return [...prev, { id: key, assignmentId, studentId, groupId: "", status: "corrected" as const, grade: gradeNum, feedback: g.feedback }];
    });
    setSavingCorrection(null);
  };

  // ── Group CRUD ──────────────────────────────────────────────────────────────
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !teacherId) return;
    setCreatingGroup(true);
    const id = await createGroup(teacherId, newGroupName.trim());
    setGroups((prev) => [...prev, { id, name: newGroupName.trim(), teacherId, studentIds: [], createdAt: null }]);
    setNewGroupName(""); setShowGroupForm(false); setCreatingGroup(false);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Supprimer ce groupe ?")) return;
    await deleteGroup(groupId);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    closeGroupTab(`group-${groupId}`);
  };

  const handleRenameGroup = async (groupId: string) => {
    if (!renameVal.trim()) return;
    await renameGroup(groupId, renameVal.trim());
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, name: renameVal.trim() } : g));
    setOpenGroupTabs((prev) => prev.map((t) => t.groupId === groupId ? { ...t, label: renameVal.trim() } : t));
    setRenamingId(null);
  };

  const handleAddStudent = async (groupId: string) => {
    const email = addEmail[groupId]?.trim();
    if (!email) return;
    setAddStatus((p) => ({ ...p, [groupId]: "loading" }));
    const found = await findUserByEmail(email.toLowerCase());
    if (!found) { setAddStatus((p) => ({ ...p, [groupId]: "notfound" })); return; }
    const group = groups.find((g) => g.id === groupId);
    if (group?.studentIds.includes(found.uid)) { setAddStatus((p) => ({ ...p, [groupId]: "already" })); return; }
    await addStudentToGroup(groupId, found.uid);
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, studentIds: [...g.studentIds, found.uid] } : g));
    setStudentMap((prev) => ({ ...prev, [found.uid]: found }));
    setAddEmail((p) => ({ ...p, [groupId]: "" }));
    setAddStatus((p) => ({ ...p, [groupId]: "ok" }));
    setTimeout(() => setAddStatus((p) => ({ ...p, [groupId]: "idle" })), 2000);
  };

  const handleRemoveStudent = async (groupId: string, uid: string) => {
    if (!confirm("Retirer cet élève du groupe ?")) return;
    await removeStudentFromGroup(groupId, uid);
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, studentIds: g.studentIds.filter((id) => id !== uid) } : g));
  };

  // ── Library CRUD ────────────────────────────────────────────────────────────
  const resetLibForm = () => {
    setLibFormTitle(""); setLibFormDesc(""); setLibFormQuestions([]);
    setLibFormFileUrl(null); setLibFormFileName(null);
    setLibFormType("cours"); setLibEditingId(null); setShowLibForm(false);
  };

  const handleLibSave = async () => {
    if (!libFormTitle.trim() || !teacherId) return;
    setLibSaving(true);
    const payload = {
      title: libFormTitle.trim(), description: libFormDesc.trim(),
      type: libFormType, questions: libFormQuestions,
      fileUrl: libFormFileUrl || undefined, fileName: libFormFileName || undefined,
    };
    if (libEditingId) {
      await updateTeacherContent(libEditingId, payload);
      setTeacherContent((prev) => prev.map((c) => c.id === libEditingId ? { ...c, ...payload } : c));
    } else {
      const id = await createTeacherContent({ teacherId, ...payload });
      setTeacherContent((prev) => [...prev, { id, teacherId, ...payload, createdAt: null } as TeacherContent]);
    }
    resetLibForm(); setLibSaving(false);
  };

  const handleLibEdit = (c: TeacherContent) => {
    setLibEditingId(c.id); setLibFormType(c.type); setLibFormTitle(c.title);
    setLibFormDesc(c.description); setLibFormQuestions(c.questions || []);
    setLibFormFileUrl((c as any).fileUrl || null); setLibFormFileName((c as any).fileName || null);
    setShowLibForm(true); setLibExpandedId(null);
  };

  const handleLibDelete = async (id: string) => {
    if (!confirm("Supprimer ce contenu ?")) return;
    await deleteTeacherContent(id);
    setTeacherContent((prev) => prev.filter((c) => c.id !== id));
  };

  // ── Computed ────────────────────────────────────────────────────────────────
  const pendingSubmissions = submissions.filter((s) => s.status === "submitted");
  const totalStudents = [...new Set(groups.flatMap((g) => g.studentIds))].length;

  const groupAssignments = (groupId: string) =>
    assignments.filter((a) => a.groupId === groupId || a.groupIds?.includes(groupId));

  const groupSubmissions = (groupId: string) => {
    const aIds = new Set(groupAssignments(groupId).map((a) => a.id));
    return submissions.filter((s) => aIds.has(s.assignmentId));
  };

  const assignmentSubmissions = (aId: string) => submissions.filter((s) => s.assignmentId === aId);

  const subForStudent = (aId: string, uid: string) =>
    submissions.find((s) => s.assignmentId === aId && s.studentId === uid) || null;

  // ── Shared: copy correction panel ───────────────────────────────────────────
  function renderCopyPanel(aId: string, groupId: string) {
    const a = assignments.find((x) => x.id === aId);
    if (!a) return null;
    const g = groups.find((x) => x.id === groupId);
    const students = (g?.studentIds || []).map((uid) => studentMap[uid]).filter(Boolean);
    return (
      <div className="space-y-3">
        {students.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aucun élève dans ce groupe.</p>}
        {students.map((student) => {
          const sub = subForStudent(aId, student.uid);
          const status = sub?.status || "not_started";
          const key = `${student.uid}_${aId}`;
          const g2 = grades[key] || { grade: "", feedback: "" };
          const canCorrect = status === "submitted" || status === "corrected";
          return (
            <div key={student.uid} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-teal-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {student.prenom?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{student.prenom} {student.nom}</span>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
              </div>
              {sub?.quizAnswers && sub.quizAnswers.length > 0 && a.questions && (
                <div className="mb-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-800">
                    Quiz : {sub.quizAnswers.filter((qa) => qa.isCorrect).length}/{a.questions.length} correctes
                  </p>
                </div>
              )}
              {sub?.textContent && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Réponse écrite</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">{sub.textContent}</p>
                </div>
              )}
              {(sub as any)?.fileUrl && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-gray-500">Fichier :</span>
                  <a href={(sub as any).fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-medium">
                    {(sub as any).fileName || "Voir le fichier"}
                  </a>
                </div>
              )}
              {canCorrect && (
                <div className="space-y-2 mt-2 pt-2 border-t border-gray-100">
                  {status === "corrected" && sub?.grade !== undefined && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-lg">Note : {sub.grade}/20</span>
                      {sub.feedback && <span className="text-xs text-gray-500 italic truncate">"{sub.feedback}"</span>}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div className="w-24 flex-shrink-0">
                      <label className="text-xs text-gray-500 mb-1 block">Note /20</label>
                      <input type="number" title={`Note de ${student.prenom}`} min={0} max={20} step={0.5} value={g2.grade}
                        onChange={(e) => setGrades((p) => ({ ...p, [key]: { ...p[key], grade: e.target.value } }))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-teal-500" placeholder="0–20" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Commentaire</label>
                      <input type="text" title="Commentaire" value={g2.feedback}
                        onChange={(e) => setGrades((p) => ({ ...p, [key]: { ...p[key], feedback: e.target.value } }))}
                        placeholder="Bon travail, à revoir…"
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-teal-500" />
                    </div>
                  </div>
                  <button type="button" onClick={() => handleSaveCorrection(aId, student.uid)} disabled={savingCorrection === key || !g2.grade}
                    className="flex items-center gap-1.5 bg-teal-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-teal-800 disabled:opacity-50 transition">
                    {savingCorrection === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    {status === "corrected" ? "Modifier la note" : "Enregistrer la note"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Shared: assignment list ─────────────────────────────────────────────────
  function renderAssignmentList(aList: Assignment[], context: string) {
    return (
      <div className="space-y-3">
        {aList.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">Aucun travail assigné.</p>
          </div>
        )}
        {aList.map((a) => {
          const isGlobal = context === "global";
          const isOpen = isGlobal ? corrOpenAssignId === a.id : groupOpenAssignId[context] === a.id;
          const subs = assignmentSubmissions(a.id);
          const submittedCount = subs.filter((s) => s.status === "submitted").length;
          const correctedCount = subs.filter((s) => s.status === "corrected").length;
          const hasQuiz = (a.questions?.length || 0) > 0;
          const aGroupIds = a.groupIds || (a.groupId ? [a.groupId] : []);
          const aGroupNames = aGroupIds.map((id) => groups.find((g) => g.id === id)?.name).filter(Boolean).join(", ");

          return (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 flex-shrink-0">
                    {TYPE_ICONS[a.type]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{a.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs">
                      <span className="text-teal-700 font-medium">{TYPE_LABELS[a.type]}</span>
                      {aGroupNames && <span className="text-gray-500">{aGroupNames}</span>}
                      {hasQuiz && <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">{a.questions!.length}Q quiz</span>}
                      {a.deadline && (
                        <span className="flex items-center gap-1 text-gray-500">
                          <Clock className="w-3 h-3" />
                          {new Date((a.deadline as any)?.toDate?.() || a.deadline).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                      {submittedCount > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">{submittedCount} à corriger</span>}
                      {correctedCount > 0 && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{correctedCount} corrigé(s)</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button type="button" onClick={() => {
                    if (isGlobal) setCorrOpenAssignId(isOpen ? null : a.id);
                    else setGroupOpenAssignId((p) => ({ ...p, [context]: isOpen ? null : a.id }));
                  }} className="text-xs font-medium text-teal-700 hover:text-teal-900 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-teal-50 transition">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    Copies
                  </button>
                  <button type="button" title="Supprimer" onClick={() => handleDeleteAssignment(a.id)}
                    className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {isOpen && (
                <div className="px-5 pb-4 bg-gray-50/50">
                  {renderCopyPanel(a.id, aGroupIds[0] || context)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Assignment form ─────────────────────────────────────────────────────────
  function renderAssignForm(context: string) {
    const isForGroup = context !== "global";
    return (
      <div className="bg-white border border-teal-100 rounded-2xl p-5 space-y-5 mb-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-800">Assigner un travail</p>
          <button type="button" title="Fermer" onClick={() => setShowAssignForm(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        {teacherContent.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-800 mb-2">Importer depuis ma bibliothèque</p>
            <div className="flex flex-wrap gap-2">
              {teacherContent.map((r) => (
                <button key={r.id} type="button" onClick={() => handleImportResource(r)}
                  className="flex items-center gap-1.5 text-xs bg-white border border-amber-200 text-amber-800 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition">
                  {r.type === "cours" ? <BookOpen className="w-3 h-3" /> : r.type === "devoir" ? <ClipboardList className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                  {r.title}
                  {(r.questions?.length || 0) > 0 && <span className="bg-amber-200 text-amber-900 px-1 rounded">{r.questions.length}Q</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {(["course", "exercise", "devoir"] as const).map((t) => (
            <button key={t} type="button" onClick={() => {
              setAssignType(t); setAssignContentId(""); setSelectedExos([]);
              setShowExoPicker(false); setAssignFileUrl(null); setAssignFileName(null);
            }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${assignType === t ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:border-teal-400"}`}>
              {TYPE_ICONS[t]} {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Titre *</label>
          <input type="text" value={assignTitle} onChange={(e) => setAssignTitle(e.target.value)} placeholder="Titre du travail…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500" />
        </div>

        <div className="space-y-3">
          <label className="text-xs font-medium text-gray-600 block">Destinataires *</label>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Groupes</p>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => {
                const sel = selectedGroupIds.includes(g.id);
                const locked = isForGroup && g.id === context;
                return (
                  <button key={g.id} type="button" disabled={locked}
                    onClick={() => setSelectedGroupIds((prev) => sel ? prev.filter((id) => id !== g.id) : [...prev, g.id])}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition ${sel ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:border-teal-400"} ${locked ? "opacity-70 cursor-default" : ""}`}>
                    <Users className="w-3 h-3" /> {g.name}
                    {sel && !locked && <X className="w-3 h-3" />}
                  </button>
                );
              })}
              {groups.length === 0 && <p className="text-xs text-gray-400">Aucun groupe.</p>}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Élèves individuels (optionnel)</p>
            <div className="flex gap-2">
              <input type="email" value={studentSearchQ} onChange={(e) => setStudentSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStudentSearch()}
                placeholder="Rechercher par email…"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-teal-500" />
              <button type="button" title="Rechercher" onClick={handleStudentSearch} className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-200 transition">
                <Search className="w-4 h-4" />
              </button>
            </div>
            {studentSearchResult === "not_found" && <p className="text-xs text-red-500 mt-1">Aucun compte trouvé.</p>}
            {studentSearchResult && studentSearchResult !== "not_found" && (
              <button type="button" onClick={() => addStudentToAssign(studentSearchResult as StudentInfo)}
                className="mt-1.5 flex items-center gap-2 bg-teal-50 text-teal-800 text-xs px-3 py-1.5 rounded-lg border border-teal-200 hover:bg-teal-100 transition">
                <Plus className="w-3 h-3" /> {(studentSearchResult as StudentInfo).prenom} {(studentSearchResult as StudentInfo).nom} — {(studentSearchResult as StudentInfo).email}
              </button>
            )}
            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedStudents.map((s) => (
                  <span key={s.uid} className="flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-800 text-xs px-2 py-0.5 rounded-full">
                    {s.prenom} {s.nom}
                    <button type="button" title="Retirer" onClick={() => {
                      setSelectedStudentIds((p) => p.filter((id) => id !== s.uid));
                      setSelectedStudents((p) => p.filter((x) => x.uid !== s.uid));
                    }}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {assignType === "course" && (
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Cours *</label>
            <select title="Choisir un cours" value={assignContentId} onChange={(e) => setAssignContentId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500">
              <option value="">Sélectionner un cours…</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.titre || c.title || c.id}</option>)}
            </select>
          </div>
        )}

        {assignType === "exercise" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 block">Exercices *</label>
            <button type="button" onClick={() => setShowExoPicker((v) => !v)}
              className="w-full flex items-center justify-between border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white hover:border-teal-400 transition text-left">
              <span className={selectedExos.length ? "text-gray-800 font-medium" : "text-gray-400"}>
                {selectedExos.length ? `${selectedExos.length} exercice(s) sélectionné(s)` : "Cliquer pour ajouter des exercices…"}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showExoPicker ? "rotate-180" : ""}`} />
            </button>
            {showExoPicker && (
              <div className="border border-gray-200 rounded-2xl bg-white shadow-lg overflow-hidden">
                <div className="flex border-b border-gray-100">
                  {(["teacherContent", "exercises"] as const).map((tab) => (
                    <button key={tab} type="button" onClick={() => { setExoPickerTab(tab); setExoSearch(""); setExoSubjectFilter(""); setExoCourseFilter(""); }}
                      className={`flex-1 py-2.5 text-sm font-medium transition border-b-2 ${exoPickerTab === tab ? "text-teal-700 border-teal-700" : "text-gray-500 border-transparent hover:text-gray-700"}`}>
                      {tab === "teacherContent" ? "Ma bibliothèque" : "Rosaine Academy"}
                    </button>
                  ))}
                </div>
                <div className="p-3 space-y-2">
                  {exoPickerTab === "teacherContent" ? (
                    <>
                      <input type="text" placeholder="Rechercher…" value={exoSearch} onChange={(e) => setExoSearch(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500" />
                      <div className="max-h-52 overflow-y-auto space-y-0.5">
                        {teacherContent.filter((r) => r.type === "exercise" && (!exoSearch || r.title.toLowerCase().includes(exoSearch.toLowerCase()))).map((r) => {
                          const isSel = selectedExos.some((e) => e.id === r.id && e.source === "teacherContent");
                          return (
                            <button key={r.id} type="button" onClick={() => setSelectedExos((prev) => isSel ? prev.filter((e) => !(e.id === r.id && e.source === "teacherContent")) : [...prev, { id: r.id, source: "teacherContent", title: r.title }])}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition ${isSel ? "bg-teal-50 text-teal-800" : "hover:bg-gray-50 text-gray-700"}`}>
                              <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${isSel ? "bg-teal-700 border-teal-700" : "border-gray-300"}`}>
                                {isSel && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="flex-1 truncate">{r.title}</span>
                            </button>
                          );
                        })}
                        {teacherContent.filter((r) => r.type === "exercise").length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-4">Aucun exercice dans votre bibliothèque.</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <select title="Matière" value={exoSubjectFilter} onChange={(e) => { setExoSubjectFilter(e.target.value); setExoCourseFilter(""); }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500">
                        <option value="">Matière…</option>
                        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      {exoSubjectFilter && (
                        <select title="Cours" value={exoCourseFilter} onChange={(e) => setExoCourseFilter(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500">
                          <option value="">Cours…</option>
                          {courses.filter((c) => c.subject_id === exoSubjectFilter).map((c) => <option key={c.id} value={c.id}>{c.titre || c.title || c.id}</option>)}
                        </select>
                      )}
                      {exoCourseFilter && (
                        <div className="max-h-52 overflow-y-auto space-y-0.5">
                          {exercises.filter((e) => e.course_ids?.includes(exoCourseFilter) || e.course_id === exoCourseFilter).map((e) => {
                            const label = e.title || e.titre || e.id;
                            const isSel = selectedExos.some((s) => s.id === e.id && s.source === "exercises");
                            return (
                              <button key={e.id} type="button" onClick={() => setSelectedExos((prev) => isSel ? prev.filter((s) => !(s.id === e.id && s.source === "exercises")) : [...prev, { id: e.id, source: "exercises", title: label }])}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition ${isSel ? "bg-teal-50 text-teal-800" : "hover:bg-gray-50 text-gray-700"}`}>
                                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${isSel ? "bg-teal-700 border-teal-700" : "border-gray-300"}`}>
                                  {isSel && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="flex-1 truncate">{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {!exoSubjectFilter && <p className="text-xs text-gray-400 text-center py-3">Sélectionnez une matière.</p>}
                    </>
                  )}
                </div>
                <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between bg-gray-50 rounded-b-2xl">
                  <span className="text-xs text-gray-500">{selectedExos.length > 0 ? `${selectedExos.length} sélectionné(s)` : "Aucun"}</span>
                  <button type="button" onClick={() => setShowExoPicker(false)} className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition ${selectedExos.length > 0 ? "bg-teal-700 text-white hover:bg-teal-800" : "bg-gray-200 text-gray-500"}`}>Confirmer</button>
                </div>
              </div>
            )}
            {selectedExos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedExos.map((e) => (
                  <span key={`${e.source}-${e.id}`} className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium px-2.5 py-1 rounded-full">
                    <span className="truncate max-w-[160px]">{e.title}</span>
                    <button type="button" title="Retirer" onClick={() => setSelectedExos((p) => p.filter((s) => !(s.id === e.id && s.source === e.source)))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Instructions (optionnel)</label>
          <textarea value={assignInstructions} onChange={(e) => setAssignInstructions(e.target.value)} rows={2}
            placeholder="Consignes particulières…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none" />
        </div>

        {assignType !== "course" && teacherId && (
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Fichier joint (optionnel)</label>
            <FileUploadZone storagePath={storagePaths.assignment(teacherId)} accept="pdfAndImages"
              initialUrl={assignFileUrl || undefined} initialName={assignFileName || undefined}
              onUploadComplete={(url, name) => { setAssignFileUrl(url); setAssignFileName(name); }}
              onRemove={() => { setAssignFileUrl(null); setAssignFileName(null); }} />
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Date limite (optionnel)</label>
          <input type="datetime-local" title="Date limite" value={assignDeadline} onChange={(e) => setAssignDeadline(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500" />
        </div>

        {(assignType === "devoir" || assignType === "exercise") && (
          <div className="border-t border-gray-100 pt-4">
            <QuizBuilder questions={assignQuestions} onChange={setAssignQuestions} />
          </div>
        )}

        <button type="button" onClick={handleCreateAssignment}
          disabled={savingAssign || !assignTitle.trim() || (assignType === "course" && !assignContentId) || (assignType === "exercise" && selectedExos.length === 0) || (selectedGroupIds.length === 0 && selectedStudentIds.length === 0)}
          className="w-full bg-teal-700 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-teal-800 disabled:opacity-50 flex items-center justify-center gap-2">
          {savingAssign ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Assigner
        </button>
      </div>
    );
  }

  // ── Tab: Dashboard ──────────────────────────────────────────────────────────
  function renderDashboard() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Users className="w-5 h-5 text-teal-700" />, val: groups.length, label: "Groupe(s)", bg: "bg-teal-50" },
            { icon: <Users className="w-5 h-5 text-blue-600" />, val: totalStudents, label: "Élève(s)", bg: "bg-blue-50" },
            { icon: <Briefcase className="w-5 h-5 text-purple-600" />, val: assignments.length, label: "Travaux assignés", bg: "bg-purple-50" },
            { icon: <ClipboardCheck className={`w-5 h-5 ${pendingSubmissions.length > 0 ? "text-amber-600" : "text-gray-400"}`} />, val: pendingSubmissions.length, label: "À corriger", bg: pendingSubmissions.length > 0 ? "bg-amber-50 ring-1 ring-amber-200" : "bg-gray-50" },
          ].map(({ icon, val, label, bg }, i) => (
            <div key={i} className={`${bg} rounded-2xl p-4`}>
              {icon}
              <p className="text-2xl font-bold text-gray-800 mt-1">{val}</p>
              <p className="text-xs text-gray-600">{label}</p>
            </div>
          ))}
        </div>

        {pendingSubmissions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-700">Copies en attente de correction</h2>
            </div>
            <div className="space-y-2">
              {[...new Map(pendingSubmissions.map((s) => [s.assignmentId, s])).values()].slice(0, 5).map((s) => {
                const a = assignments.find((x) => x.id === s.assignmentId);
                if (!a) return null;
                const count = pendingSubmissions.filter((x) => x.assignmentId === s.assignmentId).length;
                const gId = a.groupIds?.[0] || a.groupId || "";
                return (
                  <button key={s.assignmentId} type="button"
                    onClick={() => { activateTab("corrections"); setCorrectionsDrill({ level: "copies", groupId: gId }); setCorrOpenAssignId(s.assignmentId); }}
                    className="w-full bg-white border border-amber-100 rounded-2xl px-5 py-3 flex items-center justify-between hover:shadow-sm transition text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <ClipboardCheck className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{a.title}</p>
                        <p className="text-xs text-gray-500">{TYPE_LABELS[a.type]}</p>
                      </div>
                    </div>
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0">
                      {count} copie{count > 1 ? "s" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Créer un groupe", desc: "Ajouter une classe ou section", icon: <Users className="w-5 h-5 text-teal-700" />, bg: "bg-teal-50", action: () => { activateTab("groupes"); setShowGroupForm(true); } },
              { label: "Assigner un travail", desc: "Exercice, devoir ou cours", icon: <Plus className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50", action: () => activateTab("travaux") },
              { label: "Ma bibliothèque", desc: "Créer ou éditer du contenu", icon: <Library className="w-5 h-5 text-purple-600" />, bg: "bg-purple-50", action: () => activateTab("bibliotheque") },
            ].map(({ label, desc, icon, bg, action }) => (
              <button key={label} type="button" onClick={action}
                className="bg-white border border-gray-100 rounded-2xl p-4 text-left hover:border-teal-200 hover:shadow-sm transition flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Tab: Travaux ────────────────────────────────────────────────────────────
  function renderTravaux() {
    if (travauxDrill.level === "types") {
      const types = [
        { type: "exercise" as const, label: "Exercices", icon: <FileText className="w-6 h-6 text-green-600" />, bg: "bg-green-50", count: assignments.filter((a) => a.type === "exercise").length },
        { type: "devoir" as const, label: "Devoirs", icon: <ClipboardList className="w-6 h-6 text-teal-600" />, bg: "bg-teal-50", count: assignments.filter((a) => a.type === "devoir").length },
        { type: "course" as const, label: "Cours", icon: <BookOpen className="w-6 h-6 text-blue-600" />, bg: "bg-blue-50", count: assignments.filter((a) => a.type === "course").length },
      ];
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Travaux assignés</h2>
            <button type="button" onClick={() => openAssignForm("global")}
              className="flex items-center gap-2 bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-teal-800 transition">
              <Plus className="w-4 h-4" /> Assigner
            </button>
          </div>
          {showAssignForm === "global" && renderAssignForm("global")}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {types.map(({ type, label, icon, bg, count }) => (
              <button key={type} type="button" onClick={() => setTravauxDrill({ level: "assignments", type })}
                className="bg-white border border-gray-100 rounded-2xl p-5 text-left hover:border-teal-200 hover:shadow-sm transition group flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
                <div>
                  <p className="font-bold text-gray-800">{label}</p>
                  <p className="text-sm text-gray-500">{count} assigné{count !== 1 ? "s" : ""}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal-600 ml-auto transition" />
              </button>
            ))}
          </div>
        </div>
      );
    }

    const type = travauxDrill.type!;
    const filtered = assignments.filter((a) => a.type === type);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setTravauxDrill({ level: "types" })}
            className="flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 transition">
            <ChevronLeft className="w-4 h-4" /> Retour
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-700">{TYPE_LABELS[type]}s</span>
          <button type="button" onClick={() => openAssignForm("global")}
            className="ml-auto flex items-center gap-2 bg-teal-700 text-white text-sm font-medium px-3 py-1.5 rounded-xl hover:bg-teal-800 transition">
            <Plus className="w-4 h-4" /> Assigner
          </button>
        </div>
        {showAssignForm === "global" && renderAssignForm("global")}
        {renderAssignmentList(filtered, "global")}
      </div>
    );
  }

  // ── Tab: Groupes ────────────────────────────────────────────────────────────
  function renderGroupes() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Mes groupes</h2>
          <button type="button" onClick={() => setShowGroupForm((v) => !v)}
            className="flex items-center gap-2 bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-teal-800 transition">
            <Plus className="w-4 h-4" /> Créer un groupe
          </button>
        </div>

        {showGroupForm && (
          <div className="bg-white border border-teal-100 rounded-2xl p-4 flex gap-3">
            <input autoFocus type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
              placeholder="Nom du groupe (ex : Terminale C…)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500" />
            <button type="button" onClick={handleCreateGroup} disabled={creatingGroup || !newGroupName.trim()}
              className="bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-50 flex items-center gap-1">
              {creatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Créer
            </button>
            <button type="button" title="Annuler" onClick={() => setShowGroupForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {groups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold mb-1">Aucun groupe pour l'instant</p>
            <p className="text-gray-400 text-sm">Créez votre premier groupe pour commencer à assigner des travaux.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => {
              const gAssign = groupAssignments(g.id);
              const gPending = groupSubmissions(g.id).filter((s) => s.status === "submitted").length;
              return (
                <div key={g.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4">
                    {renamingId === g.id ? (
                      <div className="flex items-center gap-2 flex-1 mr-4">
                        <input autoFocus type="text" title="Nouveau nom" placeholder="Nouveau nom…" value={renameVal}
                          onChange={(e) => setRenameVal(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleRenameGroup(g.id)}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-teal-500" />
                        <button type="button" title="Confirmer" onClick={() => handleRenameGroup(g.id)} className="text-teal-700"><Check className="w-4 h-4" /></button>
                        <button type="button" title="Annuler" onClick={() => setRenamingId(null)} className="text-gray-400"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => openGroupTab(g)} className="flex items-center gap-4 flex-1 text-left group">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-teal-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 group-hover:text-teal-700 transition">{g.name}</p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                            <span>{g.studentIds.length} élève{g.studentIds.length !== 1 ? "s" : ""}</span>
                            <span>{gAssign.length} travaux</span>
                            {gPending > 0 && (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {gPending} à corriger
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )}
                    {renamingId !== g.id && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button type="button" onClick={() => openGroupTab(g)} className="bg-teal-50 text-teal-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-teal-100 transition">Ouvrir</button>
                        <button type="button" title="Renommer" onClick={() => { setRenamingId(g.id); setRenameVal(g.name); }} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"><Pencil className="w-4 h-4" /></button>
                        <button type="button" title="Supprimer" onClick={() => handleDeleteGroup(g.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Tab: Corrections ────────────────────────────────────────────────────────
  function renderCorrections() {
    if (correctionsDrill.level === "groups") {
      return (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Corrections par groupe</h2>
          {groups.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Aucun groupe.</p>}
          <div className="space-y-3">
            {groups.map((g) => {
              const pending = groupSubmissions(g.id).filter((s) => s.status === "submitted").length;
              const corrected = groupSubmissions(g.id).filter((s) => s.status === "corrected").length;
              return (
                <button key={g.id} type="button" onClick={() => setCorrectionsDrill({ level: "copies", groupId: g.id })}
                  className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 flex items-center justify-between hover:shadow-sm transition group text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-teal-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{g.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        {pending > 0 && <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-semibold">{pending} à corriger</span>}
                        {corrected > 0 && <span className="text-green-700">{corrected} corrigé(s)</span>}
                        {pending === 0 && corrected === 0 && <span>Aucune soumission</span>}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal-600 transition" />
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    const g = groups.find((x) => x.id === correctionsDrill.groupId);
    const gAssign = correctionsDrill.groupId ? groupAssignments(correctionsDrill.groupId) : [];
    const relevantAssign = gAssign.filter((a) =>
      assignmentSubmissions(a.id).some((s) => s.status === "submitted" || s.status === "corrected")
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setCorrectionsDrill({ level: "groups" })}
            className="flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 transition">
            <ChevronLeft className="w-4 h-4" /> Groupes
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-700">{g?.name || ""}</span>
        </div>
        {relevantAssign.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Check className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold mb-1">Aucune copie en attente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {relevantAssign.map((a) => {
              const subs = assignmentSubmissions(a.id).filter((s) => s.status === "submitted" || s.status === "corrected");
              const pending = subs.filter((s) => s.status === "submitted").length;
              const isOpen = corrOpenAssignId === a.id;
              return (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 flex-shrink-0">{TYPE_ICONS[a.type]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{a.title}</p>
                    </div>
                    {pending > 0 && <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full flex-shrink-0">{pending} à corriger</span>}
                    <button type="button" onClick={() => setCorrOpenAssignId(isOpen ? null : a.id)}
                      className="text-xs font-medium text-teal-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-teal-50 transition">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {subs.length} copie{subs.length > 1 ? "s" : ""}
                    </button>
                  </div>
                  {isOpen && correctionsDrill.groupId && (
                    <div className="px-5 py-4 bg-gray-50/50">
                      {renderCopyPanel(a.id, correctionsDrill.groupId)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Tab: Bibliothèque ───────────────────────────────────────────────────────
  function renderBibliotheque() {
    return (
      <div className="space-y-5">
        {showLibForm ? (
          <div className="bg-white border border-teal-100 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800">{libEditingId ? "Modifier" : "Nouveau contenu"}</p>
              <button type="button" title="Annuler" onClick={resetLibForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["cours", "devoir", "exercise"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setLibFormType(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${libFormType === t ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:border-teal-400"}`}>
                  {LIB_ICONS[t]} {LIB_LABELS[t]}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Titre *</label>
              <input type="text" value={libFormTitle} onChange={(e) => setLibFormTitle(e.target.value)} placeholder="Titre…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">{libFormType === "cours" ? "Contenu / Résumé" : "Consignes / Description"}</label>
              <textarea value={libFormDesc} onChange={(e) => setLibFormDesc(e.target.value)} rows={4}
                title={libFormType === "cours" ? "Contenu du cours" : "Description"}
                placeholder={libFormType === "cours" ? "Rédigez ici un résumé ou le contenu textuel du cours…" : "Décrivez les attentes, les critères d'évaluation…"}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none" />
            </div>
            {teacherId && (
              <FileUploadZone storagePath={storagePaths.teacherResource(teacherId, libEditingId || "draft", "")}
                accept={libFormType === "cours" ? "pdf" : "pdfAndImages"}
                label={libFormType === "cours" ? "Support PDF (optionnel)" : "Fichier joint (PDF, image)"}
                initialUrl={libFormFileUrl || undefined} initialName={libFormFileName || undefined}
                onUploadComplete={(url, name) => { setLibFormFileUrl(url); setLibFormFileName(name); }}
                onRemove={() => { setLibFormFileUrl(null); setLibFormFileName(null); }} />
            )}
            {(libFormType === "devoir" || libFormType === "exercise") && (
              <div className="border-t border-gray-100 pt-4">
                <QuizBuilder questions={libFormQuestions} onChange={setLibFormQuestions} />
              </div>
            )}
            <button type="button" onClick={handleLibSave} disabled={libSaving || !libFormTitle.trim()}
              className="w-full bg-teal-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-800 disabled:opacity-50 flex items-center justify-center gap-2">
              {libSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {libEditingId ? "Enregistrer" : "Créer"}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{teacherContent.length} contenu{teacherContent.length !== 1 ? "s" : ""}</p>
            <button type="button" onClick={() => setShowLibForm(true)}
              className="flex items-center gap-2 bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-teal-800 transition">
              <Plus className="w-4 h-4" /> Créer un contenu
            </button>
          </div>
        )}
        {teacherContent.length === 0 && !showLibForm ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Library className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold mb-1">Bibliothèque vide</p>
            <p className="text-gray-400 text-sm">Préparez vos cours, devoirs et exercices ici.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teacherContent.map((c) => {
              const hasFile = !!(c as any).fileUrl;
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-teal-50 text-teal-700">
                        {LIB_ICONS[c.type as ContentType]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{c.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs">
                          <span className="font-medium text-teal-700">{LIB_LABELS[c.type as ContentType]}</span>
                          {hasFile && (
                            <a href={(c as any).fileUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                              className="bg-blue-50 text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded-full flex items-center gap-1 transition">
                              <Eye className="w-2.5 h-2.5" /> {(c as any).fileName || "PDF"}
                            </a>
                          )}
                          {(c.questions?.length || 0) > 0 && (
                            <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">{c.questions.length}Q quiz</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button type="button" title="Modifier" onClick={() => handleLibEdit(c)} className="text-gray-400 hover:text-teal-600 p-1.5 rounded-lg hover:bg-teal-50 transition"><Pencil className="w-4 h-4" /></button>
                      <button type="button" title="Supprimer" onClick={() => handleLibDelete(c.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
                      <button type="button" title={libExpandedId === c.id ? "Réduire" : "Aperçu"} onClick={() => setLibExpandedId(libExpandedId === c.id ? null : c.id)} className="text-gray-400 hover:text-gray-600 p-1.5 transition">
                        {libExpandedId === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {libExpandedId === c.id && (
                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50 space-y-3">
                      {c.description && <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.description}</p>}
                      {hasFile && (
                        <a href={(c as any).fileUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg px-3 py-2 transition w-fit">
                          <Eye className="w-4 h-4" /> Ouvrir {(c as any).fileName || "le fichier"}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Tab: Group ──────────────────────────────────────────────────────────────
  function renderGroupTab(groupId: string) {
    const g = groups.find((x) => x.id === groupId);
    if (!g) return <p className="text-sm text-gray-400 text-center py-8">Groupe introuvable.</p>;
    const tab = groupSubtab[groupId] || "travaux";
    const gAssign = groupAssignments(groupId);
    const gSubs = groupSubmissions(groupId);
    const pendingCount = gSubs.filter((s) => s.status === "submitted").length;
    const students = g.studentIds.map((uid) => studentMap[uid]).filter(Boolean);

    return (
      <div className="space-y-4">
        <div className="flex gap-0 border-b border-gray-200">
          {([
            { id: "travaux" as const, label: "Travaux", badge: gAssign.length },
            { id: "eleves" as const, label: "Élèves", badge: students.length },
            { id: "corrections" as const, label: "Corrections", badge: pendingCount },
          ]).map(({ id, label, badge }) => (
            <button key={id} type="button" onClick={() => setGroupSubtab((p) => ({ ...p, [groupId]: id }))}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${tab === id ? "border-teal-700 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {label}
              {badge > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${id === "corrections" && badge > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "travaux" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-600">Travaux pour {g.name}</h3>
              <button type="button" onClick={() => openAssignForm(groupId, groupId)}
                className="flex items-center gap-2 bg-teal-700 text-white text-sm font-medium px-3 py-1.5 rounded-xl hover:bg-teal-800 transition">
                <Plus className="w-4 h-4" /> Assigner
              </button>
            </div>
            {showAssignForm === groupId && renderAssignForm(groupId)}
            {renderAssignmentList(gAssign, groupId)}
          </div>
        )}

        {tab === "eleves" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Ajouter un élève par email</p>
              <div className="flex gap-2">
                <input type="email" value={addEmail[groupId] || ""} onChange={(e) => setAddEmail((p) => ({ ...p, [groupId]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleAddStudent(groupId)}
                  placeholder="email@exemple.com"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500" />
                <button type="button" onClick={() => handleAddStudent(groupId)} disabled={addStatus[groupId] === "loading" || !addEmail[groupId]?.trim()}
                  className="bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-50 flex items-center gap-1">
                  {addStatus[groupId] === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Ajouter
                </button>
              </div>
              {addStatus[groupId] === "notfound" && <p className="text-xs text-red-500 mt-2">Aucun compte trouvé avec cet email.</p>}
              {addStatus[groupId] === "already" && <p className="text-xs text-amber-600 mt-2">Cet élève est déjà dans le groupe.</p>}
              {addStatus[groupId] === "ok" && <p className="text-xs text-green-600 mt-2">Élève ajouté avec succès.</p>}
            </div>
            {students.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucun élève dans ce groupe.</p>
            ) : (
              <div className="space-y-2">
                {students.map((s) => (
                  <div key={s.uid} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center text-white text-xs font-bold">
                        {s.prenom?.[0]?.toUpperCase() || "?"}{s.nom?.[0]?.toUpperCase() || ""}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.prenom} {s.nom}</p>
                        <p className="text-xs text-gray-500">{s.email}</p>
                      </div>
                    </div>
                    <button type="button" title="Retirer l'élève" onClick={() => handleRemoveStudent(groupId, s.uid)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "corrections" && (
          <div className="space-y-4">
            {gAssign.filter((a) => assignmentSubmissions(a.id).some((s) => s.status === "submitted" || s.status === "corrected")).length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <Check className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="text-gray-700 font-semibold mb-1">Aucune copie en attente</p>
              </div>
            ) : (
              gAssign.map((a) => {
                const subs = assignmentSubmissions(a.id).filter((s) => s.status === "submitted" || s.status === "corrected");
                if (subs.length === 0) return null;
                const isOpen = groupOpenAssignId[groupId] === a.id;
                const pending = subs.filter((s) => s.status === "submitted").length;
                return (
                  <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 flex-shrink-0">{TYPE_ICONS[a.type]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{a.title}</p>
                      </div>
                      {pending > 0 && <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full flex-shrink-0">{pending} à corriger</span>}
                      <button type="button" onClick={() => setGroupOpenAssignId((p) => ({ ...p, [groupId]: isOpen ? null : a.id }))}
                        className="text-xs font-medium text-teal-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-teal-50 transition">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {subs.length} copie{subs.length > 1 ? "s" : ""}
                      </button>
                    </div>
                    {isOpen && (
                      <div className="px-5 pb-4 bg-gray-50/50">
                        {renderCopyPanel(a.id, groupId)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Active tab content ──────────────────────────────────────────────────────
  function renderTabContent() {
    if (activeTabId === "dashboard") return renderDashboard();
    if (activeTabId === "travaux") return renderTravaux();
    if (activeTabId === "groupes") return renderGroupes();
    if (activeTabId === "corrections") return renderCorrections();
    if (activeTabId === "bibliotheque") return renderBibliotheque();
    if (activeTabId.startsWith("group-")) return renderGroupTab(activeTabId.replace("group-", ""));
    return null;
  }

  const SIDEBAR_ITEMS = [
    { id: "dashboard" as const, label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "travaux" as const, label: "Travaux", icon: <Briefcase className="w-4 h-4" />, badge: assignments.length },
    { id: "groupes" as const, label: "Groupes", icon: <Users className="w-4 h-4" />, badge: groups.length },
    { id: "corrections" as const, label: "Corrections", icon: <ClipboardCheck className="w-4 h-4" />, badge: pendingSubmissions.length, badgeAlert: pendingSubmissions.length > 0 },
    { id: "bibliotheque" as const, label: "Bibliothèque", icon: <Library className="w-4 h-4" /> },
  ];

  const activeGroupTab = openGroupTabs.find((t) => t.id === activeTabId);

  return (
    <ProtectTeacherRoute>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-60 bg-teal-800 flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <div className="px-4 py-5 border-b border-teal-700">
            <div className="flex items-center gap-2 text-white">
              <BookOpen className="w-5 h-5 opacity-80" />
              <span className="font-bold text-sm">Espace enseignant</span>
            </div>
            {teacherName && <p className="text-teal-200 text-xs mt-1 truncate">{teacherName}</p>}
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = activeTabId === item.id;
              return (
                <button key={item.id} type="button" onClick={() => activateTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${isActive ? "bg-white/15 text-white" : "text-teal-100 hover:bg-white/10 hover:text-white"}`}>
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {(item as any).badge !== undefined && (item as any).badge > 0 && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${(item as any).badgeAlert ? "bg-amber-400 text-amber-900" : "bg-white/20 text-white"}`}>
                      {(item as any).badge}
                    </span>
                  )}
                </button>
              );
            })}
            {openGroupTabs.length > 0 && (
              <div className="pt-2 mt-2 border-t border-teal-700">
                <p className="text-xs text-teal-400 px-3 mb-1 uppercase tracking-widest">Groupes ouverts</p>
                {openGroupTabs.map((t) => {
                  const isActive = activeTabId === t.id;
                  return (
                    <div key={t.id} className={`flex items-center rounded-xl transition ${isActive ? "bg-white/15" : "hover:bg-white/10"}`}>
                      <button type="button" onClick={() => activateTab(t.id)} className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-left">
                        <Users className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-white" : "text-teal-300"}`} />
                        <span className={`truncate text-sm font-medium ${isActive ? "text-white" : "text-teal-100"}`}>{t.label}</span>
                      </button>
                      <button type="button" title="Fermer" onClick={() => closeGroupTab(t.id)} className="text-teal-400 hover:text-white p-1.5 flex-shrink-0 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="bg-teal-700 text-white flex-shrink-0">
            <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
              <button type="button" title="Menu" onClick={() => setSidebarOpen(true)} className="lg:hidden text-white/70 hover:text-white transition">
                <Menu className="w-5 h-5" />
              </button>
              <div className="text-sm font-semibold text-white flex items-center gap-1">
                {activeGroupTab ? (
                  <><button type="button" className="text-teal-200 hover:text-white transition" onClick={() => activateTab("groupes")}>Groupes</button>
                    <ChevronRight className="w-4 h-4 text-teal-300 flex-shrink-0" />
                    <span className="truncate">{activeGroupTab.label}</span></>
                ) : (
                  SIDEBAR_ITEMS.find((i) => i.id === activeTabId)?.label || ""
                )}
              </div>
            </div>
            {/* Tab bar */}
            <div className="flex items-center gap-0 px-4 sm:px-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {SIDEBAR_ITEMS.map((item) => (
                <button key={item.id} type="button" onClick={() => activateTab(item.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition ${activeTabId === item.id ? "border-white text-white" : "border-transparent text-teal-200 hover:text-white"}`}>
                  {item.label}
                  {(item as any).badgeAlert && ((item as any).badge || 0) > 0 && (
                    <span className="bg-amber-400 text-amber-900 text-xs font-bold px-1.5 py-0.5 rounded-full">{(item as any).badge}</span>
                  )}
                </button>
              ))}
              {openGroupTabs.map((t) => (
                <div key={t.id} className={`flex-shrink-0 flex items-center gap-0 border-b-2 transition ${activeTabId === t.id ? "border-white" : "border-transparent"}`}>
                  <button type="button" onClick={() => activateTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${activeTabId === t.id ? "text-white" : "text-teal-200 hover:text-white"}`}>
                    <Users className="w-3 h-3" /> {t.label}
                  </button>
                  <button type="button" title="Fermer" onClick={() => closeGroupTab(t.id)} className="text-teal-300 hover:text-white pr-2 py-2 transition">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-7 h-7 animate-spin text-teal-700" />
                </div>
              ) : (
                renderTabContent()
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectTeacherRoute>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  Users, Plus, Trash2, ArrowLeft, Loader2, X, Check,
  BookOpen, FileText, ClipboardList, Clock, ChevronDown, ChevronUp,
  AlertCircle, Library,
} from "lucide-react";
import ProtectTeacherRoute from "@/components/auth/ProtectTeacherRoute";
import QuizBuilder from "@/components/teacher/QuizBuilder";
import {
  getGroup,
  addStudentToGroup,
  removeStudentFromGroup,
  findUserByEmail,
  getGroupAssignments,
  createAssignment,
  deleteAssignment,
  getGroupSubmissions,
  saveCorrection,
  getTeacherContent,
} from "@/helpers/teacherFetchers";
import type { Group, Assignment, Submission, QuizQuestion, TeacherContent, SelectedExercise } from "@/type/teacher";

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
  submitted: "Terminé / Soumis",
  corrected: "Corrigé",
};
const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-500",
  in_progress: "bg-blue-100 text-blue-700",
  submitted: "bg-amber-100 text-amber-700",
  corrected: "bg-green-100 text-green-700",
};

interface StudentInfo { uid: string; nom: string; prenom: string; email: string; }

export default function GroupDetailPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allSubs, setAllSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Add student
  const [addEmail, setAddEmail] = useState("");
  const [addStatus, setAddStatus] = useState<"idle" | "loading" | "ok" | "notfound" | "already">("idle");

  // Create assignment form
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [myResources, setMyResources] = useState<TeacherContent[]>([]);
  const [assignType, setAssignType] = useState<"course" | "exercise" | "devoir">("devoir");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignContentId, setAssignContentId] = useState("");
  const [assignDeadline, setAssignDeadline] = useState("");
  const [assignInstructions, setAssignInstructions] = useState("");
  const [assignQuestions, setAssignQuestions] = useState<QuizQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  // Exercise picker
  const [selectedExos, setSelectedExos] = useState<SelectedExercise[]>([]);
  const [showExoPicker, setShowExoPicker] = useState(false);
  const [exoPickerTab, setExoPickerTab] = useState<"exercises" | "teacherContent">("teacherContent");
  const [exoSearch, setExoSearch] = useState("");
  const [exoSubjectFilter, setExoSubjectFilter] = useState("");
  const [exoCourseFilter, setExoCourseFilter] = useState("");

  // Submissions panel
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);
  const [grades, setGrades] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [savingCorrection, setSavingCorrection] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      const [g, a, courseSnap, exoSnap, resources, subjectSnap] = await Promise.all([
        getGroup(groupId),
        getGroupAssignments(groupId),
        getDocs(collection(db, "courses")),
        getDocs(collection(db, "exercises")),
        getTeacherContent(user.uid),
        getDocs(collection(db, "subjects")),
      ]);
      if (!g) { router.push("/teacher"); return; }
      setGroup(g);
      setAssignments(a);
      setCourses(courseSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setExercises(exoSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setMyResources(resources);
      setSubjects(subjectSnap.docs.map((d) => ({ id: d.id, name: (d.data() as any).name || d.id })));

      const [subs, usersSnap] = await Promise.all([
        getGroupSubmissions(groupId),
        getDocs(collection(db, "users")),
      ]);
      setAllSubs(subs);
      const allUsers = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as any));
      setStudents(allUsers.filter((u: any) => g.studentIds.includes(u.uid)));

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
      setLoading(false);
    });
    return () => unsub();
  }, [groupId, router]);

  const getSubForStudent = (assignmentId: string, studentId: string) =>
    allSubs.find((s) => s.assignmentId === assignmentId && s.studentId === studentId) || null;

  const getCount = (assignmentId: string, status: string) =>
    allSubs.filter((s) => s.assignmentId === assignmentId && s.status === status).length;

  const handleAddStudent = async () => {
    if (!addEmail.trim() || !group) return;
    setAddStatus("loading");
    const found = await findUserByEmail(addEmail.trim().toLowerCase());
    if (!found) { setAddStatus("notfound"); return; }
    if (group.studentIds.includes(found.uid)) { setAddStatus("already"); return; }
    await addStudentToGroup(groupId, found.uid);
    setGroup((prev) => prev ? { ...prev, studentIds: [...prev.studentIds, found.uid] } : prev);
    setStudents((prev) => [...prev, found]);
    setAddEmail("");
    setAddStatus("ok");
    setTimeout(() => setAddStatus("idle"), 2000);
  };

  const handleRemoveStudent = async (uid: string) => {
    if (!confirm("Retirer cet élève du groupe ?")) return;
    await removeStudentFromGroup(groupId, uid);
    setGroup((prev) => prev ? { ...prev, studentIds: prev.studentIds.filter((id) => id !== uid) } : prev);
    setStudents((prev) => prev.filter((s) => s.uid !== uid));
  };

  // Import a resource template into the form
  const handleImportResource = (r: TeacherContent) => {
    const aType: "course" | "exercise" | "devoir" =
      r.type === "exercise" ? "exercise" : "devoir";
    setAssignType(aType);
    setAssignTitle(r.title);
    setAssignInstructions(r.description || "");
    setAssignQuestions(r.questions || []);
    if (aType === "exercise") {
      setSelectedExos((prev) =>
        prev.some((e) => e.id === r.id && e.source === "teacherContent")
          ? prev
          : [...prev, { id: r.id, source: "teacherContent", title: r.title }]
      );
    } else {
      setAssignContentId(r.id);
    }
  };

  const handleCreateAssignment = async () => {
    if (!assignTitle.trim()) return;
    if (assignType === "course" && !assignContentId) return;
    if (assignType === "exercise" && selectedExos.length === 0) return;
    setSaving(true);
    const id = await createAssignment({
      title: assignTitle.trim(),
      groupId,
      teacherId: auth.currentUser!.uid,
      type: assignType,
      contentId: assignType === "course" ? assignContentId : undefined,
      selectedExercises: assignType === "exercise" ? selectedExos : undefined,
      instructions: assignInstructions || undefined,
      deadline: assignDeadline ? new Date(assignDeadline) : undefined,
      questions: assignQuestions.length > 0 ? assignQuestions : undefined,
    });
    setAssignments((prev) => [...prev, {
      id, title: assignTitle.trim(), groupId,
      teacherId: auth.currentUser!.uid, type: assignType,
      contentId: assignType === "course" ? assignContentId : undefined,
      selectedExercises: assignType === "exercise" ? selectedExos : undefined,
      instructions: assignInstructions || undefined,
      deadline: assignDeadline ? new Date(assignDeadline) : undefined,
      questions: assignQuestions.length > 0 ? assignQuestions : undefined,
      createdAt: null,
    }]);
    setAssignTitle(""); setAssignContentId(""); setAssignDeadline("");
    setAssignInstructions(""); setAssignQuestions([]);
    setSelectedExos([]); setShowExoPicker(false);
    setExoPickerTab("teacherContent"); setExoSearch("");
    setExoSubjectFilter(""); setExoCourseFilter("");
    setShowAssignForm(false); setSaving(false);
    setOpenAssignmentId(id);
  };

  const handleDeleteAssignment = async (aId: string) => {
    if (!confirm("Supprimer ce travail ?")) return;
    await deleteAssignment(aId);
    setAssignments((prev) => prev.filter((a) => a.id !== aId));
    if (openAssignmentId === aId) setOpenAssignmentId(null);
  };

  const handleSaveCorrection = async (assignmentId: string, studentId: string) => {
    const key = `${studentId}_${assignmentId}`;
    const g = grades[key] || { grade: "", feedback: "" };
    const gradeNum = parseFloat(g.grade);
    if (isNaN(gradeNum)) return;
    setSavingCorrection(key);
    await saveCorrection(assignmentId, studentId, gradeNum, g.feedback);
    setAllSubs((prev) => {
      const exists = prev.find((s) => s.assignmentId === assignmentId && s.studentId === studentId);
      if (exists) {
        return prev.map((s) =>
          s.assignmentId === assignmentId && s.studentId === studentId
            ? { ...s, grade: gradeNum, feedback: g.feedback, status: "corrected" }
            : s
        );
      }
      return [...prev, {
        id: key, assignmentId, studentId, groupId,
        status: "corrected", grade: gradeNum, feedback: g.feedback,
      } as Submission];
    });
    setSavingCorrection(null);
  };

  if (loading) {
    return (
      <ProtectTeacherRoute>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-teal-700" />
        </div>
      </ProtectTeacherRoute>
    );
  }

  return (
    <ProtectTeacherRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-teal-700 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <button
              type="button"
              onClick={() => router.push("/teacher")}
              className="flex items-center gap-2 text-teal-100 hover:text-white text-sm mb-3 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{group?.name}</h1>
                <p className="text-teal-100 text-sm">{students.length} élève(s)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

          {/* ── Élèves ── */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">Élèves du groupe</h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Ajouter un élève par email</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddStudent()}
                  placeholder="email@exemple.com"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={handleAddStudent}
                  disabled={addStatus === "loading" || !addEmail.trim()}
                  className="bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-50 flex items-center gap-1"
                >
                  {addStatus === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Ajouter
                </button>
              </div>
              {addStatus === "notfound" && <p className="text-xs text-red-500 mt-2">Aucun compte trouvé avec cet email.</p>}
              {addStatus === "already" && <p className="text-xs text-amber-600 mt-2">Cet élève est déjà dans le groupe.</p>}
              {addStatus === "ok" && <p className="text-xs text-green-600 mt-2">Élève ajouté avec succès.</p>}
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
                    <button
                      type="button"
                      title="Retirer l'élève"
                      onClick={() => handleRemoveStudent(s.uid)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Travaux assignés & Copies ── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Travaux assignés</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/teacher/resources")}
                  className="flex items-center gap-1.5 text-sm font-medium text-teal-700 border border-teal-200 px-3 py-2 rounded-xl hover:bg-teal-50 transition"
                >
                  <Library className="w-4 h-4" /> Ma bibliothèque
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAssignForm((v) => !v); setAssignQuestions([]); }}
                  className="flex items-center gap-2 bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-teal-800 transition"
                >
                  <Plus className="w-4 h-4" /> Assigner
                </button>
              </div>
            </div>

            {/* Formulaire création */}
            {showAssignForm && (
              <div className="bg-white border border-teal-100 rounded-2xl p-5 mb-4 space-y-5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-800">Assigner un travail</p>
                  <button type="button" title="Fermer" onClick={() => setShowAssignForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Import depuis ressources */}
                {myResources.length > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
                      <Library className="w-3.5 h-3.5" /> Importer depuis ma bibliothèque
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {myResources.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleImportResource(r)}
                          className="flex items-center gap-1.5 text-xs bg-white border border-amber-200 text-amber-800 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition"
                        >
                          {r.type === "cours"
                            ? <BookOpen className="w-3 h-3" />
                            : r.type === "devoir"
                            ? <ClipboardList className="w-3 h-3" />
                            : <FileText className="w-3 h-3" />}
                          {r.title}
                          {(r.questions?.length || 0) > 0 && (
                            <span className="bg-amber-200 text-amber-900 px-1 rounded text-xs">{r.questions.length}Q</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Type selector */}
                <div className="flex gap-2 flex-wrap">
                  {(["course", "exercise", "devoir"] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => {
                        setAssignType(t);
                        setAssignContentId("");
                        setSelectedExos([]);
                        setShowExoPicker(false);
                        setExoPickerTab("teacherContent");
                        setExoSearch("");
                        setExoSubjectFilter("");
                        setExoCourseFilter("");
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                        assignType === t ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:border-teal-400"
                      }`}
                    >
                      {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Titre *</label>
                  <input
                    type="text"
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    placeholder="Ex : Lire le chapitre 3, Devoir maison n°2…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                  />
                </div>

                {assignType === "course" && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Cours *</label>
                    <select
                      title="Choisir un cours"
                      value={assignContentId}
                      onChange={(e) => setAssignContentId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                    >
                      <option value="">Sélectionner un cours…</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.titre || c.title || c.id}</option>
                      ))}
                    </select>
                  </div>
                )}

                {assignType === "exercise" && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600 block">Exercices *</label>

                    {/* Trigger */}
                    <button
                      type="button"
                      onClick={() => setShowExoPicker((v) => !v)}
                      className="w-full flex items-center justify-between border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white hover:border-teal-400 transition text-left"
                    >
                      <span className={selectedExos.length ? "text-gray-800 font-medium" : "text-gray-400"}>
                        {selectedExos.length
                          ? `${selectedExos.length} exercice(s) sélectionné(s)`
                          : "Cliquer pour ajouter des exercices…"}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showExoPicker ? "rotate-180" : ""}`} />
                    </button>

                    {/* Picker panel */}
                    {showExoPicker && (
                      <div className="border border-gray-200 rounded-2xl bg-white shadow-lg overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-100">
                          {(["teacherContent", "exercises"] as const).map((tab) => (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => {
                                setExoPickerTab(tab);
                                setExoSearch("");
                                setExoSubjectFilter("");
                                setExoCourseFilter("");
                              }}
                              className={`flex-1 py-2.5 text-sm font-medium transition border-b-2 ${
                                exoPickerTab === tab
                                  ? "text-teal-700 border-teal-700"
                                  : "text-gray-500 border-transparent hover:text-gray-700"
                              }`}
                            >
                              {tab === "teacherContent" ? "Ma bibliothèque" : "Rosaine Academy"}
                            </button>
                          ))}
                        </div>

                        <div className="p-3 space-y-2">
                          {exoPickerTab === "teacherContent" ? (
                            /* ── Bibliothèque ── */
                            <>
                              <input
                                type="text"
                                placeholder="Rechercher dans ma bibliothèque…"
                                value={exoSearch}
                                onChange={(e) => setExoSearch(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                              />
                              <div className="max-h-52 overflow-y-auto space-y-0.5">
                                {myResources
                                  .filter(
                                    (r) =>
                                      r.type === "exercise" &&
                                      (!exoSearch || r.title.toLowerCase().includes(exoSearch.toLowerCase()))
                                  )
                                  .map((r) => {
                                    const isSelected = selectedExos.some(
                                      (e) => e.id === r.id && e.source === "teacherContent"
                                    );
                                    return (
                                      <button
                                        key={r.id}
                                        type="button"
                                        onClick={() =>
                                          setSelectedExos((prev) =>
                                            isSelected
                                              ? prev.filter(
                                                  (e) => !(e.id === r.id && e.source === "teacherContent")
                                                )
                                              : [...prev, { id: r.id, source: "teacherContent", title: r.title }]
                                          )
                                        }
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition ${
                                          isSelected ? "bg-teal-50 text-teal-800" : "hover:bg-gray-50 text-gray-700"
                                        }`}
                                      >
                                        <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition ${isSelected ? "bg-teal-700 border-teal-700" : "border-gray-300"}`}>
                                          {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="flex-1 truncate">{r.title}</span>
                                        {(r.questions?.length ?? 0) > 0 && (
                                          <span className="text-xs text-gray-400 flex-shrink-0">{r.questions.length}Q</span>
                                        )}
                                      </button>
                                    );
                                  })}
                                {myResources.filter((r) => r.type === "exercise").length === 0 && (
                                  <p className="text-xs text-gray-400 text-center py-4">
                                    Aucun exercice dans votre bibliothèque.
                                  </p>
                                )}
                              </div>
                            </>
                          ) : (
                            /* ── Rosaine : matière → cours → exercices ── */
                            <>
                              <select
                                title="Matière"
                                value={exoSubjectFilter}
                                onChange={(e) => { setExoSubjectFilter(e.target.value); setExoCourseFilter(""); }}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                              >
                                <option value="">Matière…</option>
                                {subjects.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>

                              {exoSubjectFilter && (
                                <select
                                  title="Cours"
                                  value={exoCourseFilter}
                                  onChange={(e) => setExoCourseFilter(e.target.value)}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                                >
                                  <option value="">Cours…</option>
                                  {courses
                                    .filter((c) => c.subject_id === exoSubjectFilter)
                                    .map((c) => (
                                      <option key={c.id} value={c.id}>{c.titre || c.title || c.id}</option>
                                    ))}
                                </select>
                              )}

                              {exoCourseFilter && (
                                <div className="max-h-52 overflow-y-auto space-y-0.5">
                                  {exercises
                                    .filter(
                                      (e) =>
                                        e.course_ids?.includes(exoCourseFilter) ||
                                        e.course_id === exoCourseFilter
                                    )
                                    .map((e) => {
                                      const label = e.title || e.titre || e.id;
                                      const isSelected = selectedExos.some(
                                        (s) => s.id === e.id && s.source === "exercises"
                                      );
                                      return (
                                        <button
                                          key={e.id}
                                          type="button"
                                          onClick={() =>
                                            setSelectedExos((prev) =>
                                              isSelected
                                                ? prev.filter(
                                                    (s) => !(s.id === e.id && s.source === "exercises")
                                                  )
                                                : [...prev, { id: e.id, source: "exercises", title: label }]
                                            )
                                          }
                                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition ${
                                            isSelected ? "bg-teal-50 text-teal-800" : "hover:bg-gray-50 text-gray-700"
                                          }`}
                                        >
                                          <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition ${isSelected ? "bg-teal-700 border-teal-700" : "border-gray-300"}`}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                          </div>
                                          <span className="flex-1 truncate">{label}</span>
                                        </button>
                                      );
                                    })}
                                  {exercises.filter(
                                    (e) =>
                                      e.course_ids?.includes(exoCourseFilter) ||
                                      e.course_id === exoCourseFilter
                                  ).length === 0 && (
                                    <p className="text-xs text-gray-400 text-center py-4">
                                      Aucun exercice pour ce cours.
                                    </p>
                                  )}
                                </div>
                              )}

                              {!exoSubjectFilter && (
                                <p className="text-xs text-gray-400 text-center py-3">
                                  Sélectionnez une matière pour commencer.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tags des exercices sélectionnés */}
                    {selectedExos.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {selectedExos.map((e) => (
                          <div
                            key={`${e.source}-${e.id}`}
                            className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium px-2.5 py-1 rounded-full"
                          >
                            <span className="truncate max-w-[180px]">{e.title}</span>
                            <button
                              type="button"
                              title="Retirer"
                              onClick={() =>
                                setSelectedExos((prev) =>
                                  prev.filter((s) => !(s.id === e.id && s.source === e.source))
                                )
                              }
                              className="text-teal-500 hover:text-teal-800 flex-shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Instructions / Consignes</label>
                  <textarea
                    value={assignInstructions}
                    onChange={(e) => setAssignInstructions(e.target.value)}
                    rows={2}
                    placeholder="Consignes particulières pour les élèves…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Date limite (optionnel)</label>
                  <input
                    type="datetime-local"
                    title="Date et heure limite"
                    value={assignDeadline}
                    onChange={(e) => setAssignDeadline(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                  />
                </div>

                {/* Quiz builder — pour devoir et exercice */}
                {(assignType === "devoir" || assignType === "exercise") && (
                  <div className="border-t border-gray-100 pt-4">
                    <QuizBuilder questions={assignQuestions} onChange={setAssignQuestions} />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCreateAssignment}
                  disabled={
                    saving || !assignTitle.trim() ||
                    (assignType === "course" && !assignContentId) ||
                    (assignType === "exercise" && !assignContentId)
                  }
                  className="w-full bg-teal-700 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-teal-800 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Assigner au groupe
                </button>
              </div>
            )}

            {assignments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                <p className="text-gray-400 text-sm">Aucun travail assigné à ce groupe.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((a) => {
                  const isOpen = openAssignmentId === a.id;
                  const submittedCount = getCount(a.id, "submitted");
                  const inProgressCount = getCount(a.id, "in_progress");
                  const correctedCount = getCount(a.id, "corrected");
                  const total = students.length;
                  const hasQuiz = (a.questions?.length || 0) > 0;

                  return (
                    <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      {/* Header */}
                      <div className="px-5 py-4 border-b border-gray-50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 flex-shrink-0">
                              {TYPE_ICONS[a.type]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 text-sm truncate">{a.title}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs text-teal-700 font-medium">{TYPE_LABELS[a.type]}</span>
                                {hasQuiz && (
                                  <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">
                                    {a.questions!.length}Q quiz
                                  </span>
                                )}
                                {a.deadline && (
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    {new Date((a.deadline as any)?.toDate?.() || a.deadline).toLocaleDateString("fr-FR")}
                                  </span>
                                )}
                              </div>
                              {a.instructions && (
                                <p className="text-xs text-amber-700 mt-1 flex items-center gap-1 truncate">
                                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                  {a.instructions}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            title="Supprimer ce travail"
                            onClick={() => handleDeleteAssignment(a.id)}
                            className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Status badges + toggle */}
                        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            {total > 0 && (
                              <>
                                <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                  {Math.max(0, total - inProgressCount - submittedCount - correctedCount)} non commencé{total - inProgressCount - submittedCount - correctedCount > 1 ? "s" : ""}
                                </span>
                                {inProgressCount > 0 && (
                                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{inProgressCount} en cours</span>
                                )}
                                {submittedCount > 0 && (
                                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{submittedCount} à corriger</span>
                                )}
                                {correctedCount > 0 && (
                                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{correctedCount} corrigé{correctedCount > 1 ? "s" : ""}</span>
                                )}
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setOpenAssignmentId(isOpen ? null : a.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 transition flex-shrink-0"
                          >
                            {isOpen ? (
                              <><ChevronUp className="w-4 h-4" /> Masquer</>
                            ) : (
                              <><ChevronDown className="w-4 h-4" /> Voir les copies ({total})</>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Submissions panel */}
                      {isOpen && (
                        <div className="px-5 py-4 bg-gray-50/50 space-y-3">
                          {students.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-2">Aucun élève dans ce groupe.</p>
                          ) : (
                            students.map((student) => {
                              const sub = getSubForStudent(a.id, student.uid);
                              const status = sub?.status || "not_started";
                              const key = `${student.uid}_${a.id}`;
                              const g = grades[key] || { grade: "", feedback: "" };
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
                                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[status]}`}>
                                      {STATUS_LABELS[status]}
                                    </span>
                                  </div>

                                  {/* Quiz answers (if any) */}
                                  {sub?.quizAnswers && sub.quizAnswers.length > 0 && a.questions && (
                                    <div className="mb-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
                                      <p className="text-xs font-semibold text-blue-800 mb-2">
                                        Quiz : {sub.quizAnswers.filter((qa) => qa.isCorrect).length}/{a.questions.length} correctes
                                      </p>
                                      <div className="space-y-1.5">
                                        {sub.quizAnswers.map((qa, qi) => {
                                          const q = a.questions![qa.questionIndex];
                                          if (!q) return null;
                                          return (
                                            <div key={qi} className={`text-xs px-2 py-1 rounded-lg flex items-start gap-2 ${qa.isCorrect ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                                              {qa.isCorrect
                                                ? <Check className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                : <X className="w-3 h-3 mt-0.5 flex-shrink-0" />}
                                              <div>
                                                <span className="font-medium">Q{qi + 1} :</span> {q.options[qa.selectedOption] || "Non répondu"}
                                                {qa.justification && (
                                                  <span className="block text-gray-500 italic mt-0.5">"{qa.justification}"</span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Text submission */}
                                  {sub?.textContent && (
                                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                      <p className="text-xs text-gray-500 mb-1 font-medium">Réponse écrite</p>
                                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{sub.textContent}</p>
                                    </div>
                                  )}

                                  {/* Attached file */}
                                  {(sub as any)?.fileUrl && (
                                    <div className="flex items-center gap-2 mb-3">
                                      <span className="text-xs text-gray-500">Fichier joint :</span>
                                      <a
                                        href={(sub as any).fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline font-medium"
                                      >
                                        {(sub as any).fileName || "Voir le fichier"}
                                      </a>
                                    </div>
                                  )}

                                  {/* Correction form */}
                                  {canCorrect && (
                                    <div className="space-y-2 mt-2 pt-2 border-t border-gray-100">
                                      <p className="text-xs font-semibold text-gray-600">
                                        {status === "corrected" ? "Modifier la correction" : "Corriger"}
                                      </p>
                                      {status === "corrected" && sub?.grade !== undefined && (
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-xs bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-lg">Note : {sub.grade}/20</span>
                                          {sub.feedback && <span className="text-xs text-gray-500 italic">"{sub.feedback}"</span>}
                                        </div>
                                      )}
                                      <div className="flex gap-2">
                                        <div className="w-24 flex-shrink-0">
                                          <label className="text-xs text-gray-500 mb-1 block">Note /20</label>
                                          <input
                                            type="number"
                                            title={`Note de ${student.prenom}`}
                                            min={0} max={20} step={0.5}
                                            value={g.grade}
                                            onChange={(e) => setGrades((prev) => ({ ...prev, [key]: { ...prev[key], grade: e.target.value } }))}
                                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-teal-500"
                                            placeholder="0–20"
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <label className="text-xs text-gray-500 mb-1 block">Commentaire</label>
                                          <input
                                            type="text"
                                            title="Commentaire à l'élève"
                                            value={g.feedback}
                                            onChange={(e) => setGrades((prev) => ({ ...prev, [key]: { ...prev[key], feedback: e.target.value } }))}
                                            placeholder="Bon travail, à revoir…"
                                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-teal-500"
                                          />
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveCorrection(a.id, student.uid)}
                                        disabled={savingCorrection === key || !g.grade}
                                        className="flex items-center gap-1.5 bg-teal-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-teal-800 disabled:opacity-50 transition"
                                      >
                                        {savingCorrection === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                        Enregistrer la note
                                      </button>
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
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </ProtectTeacherRoute>
  );
}

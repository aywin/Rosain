"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  Users, Plus, BookOpen, Loader2, Trash2, Pencil, X, Check,
  FolderOpen, ClipboardCheck, AlertTriangle, ChevronRight, Clock,
} from "lucide-react";
import ProtectTeacherRoute from "@/components/auth/ProtectTeacherRoute";
import {
  createGroup,
  deleteGroup,
  renameGroup,
  getTeacherDashboardData,
} from "@/helpers/teacherFetchers";
import type { Group, Assignment, Submission } from "@/type/teacher";

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      setTeacherId(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setTeacherName(d.prenom || d.nom || "");
      }
      const data = await getTeacherDashboardData(user.uid);
      setGroups(data.groups);
      setAssignments(data.assignments);
      setSubmissions(data.submissions);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreate = async () => {
    if (!newGroupName.trim() || !teacherId) return;
    setCreating(true);
    const id = await createGroup(teacherId, newGroupName.trim());
    setGroups((prev) => [...prev, { id, name: newGroupName.trim(), teacherId, studentIds: [], createdAt: null }]);
    setNewGroupName("");
    setShowForm(false);
    setCreating(false);
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm("Supprimer ce groupe ?")) return;
    await deleteGroup(groupId);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const handleRename = async (groupId: string) => {
    if (!renameVal.trim()) return;
    await renameGroup(groupId, renameVal.trim());
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, name: renameVal.trim() } : g));
    setRenamingId(null);
  };

  // Computed stats
  const totalStudents = groups.reduce((sum, g) => sum + g.studentIds.length, 0);
  const pendingCorrections = submissions.filter((s) => s.status === "submitted");
  const correctedCount = submissions.filter((s) => s.status === "corrected").length;

  // Group pending corrections by assignment for the "À corriger" section
  const pendingByAssignment = new Map<string, { assignment: Assignment; count: number; groupName: string }>();
  pendingCorrections.forEach((s) => {
    const a = assignments.find((a) => a.id === s.assignmentId);
    if (!a) return;
    const existing = pendingByAssignment.get(a.id);
    if (existing) {
      existing.count++;
    } else {
      const g = groups.find((g) => g.id === a.groupId);
      pendingByAssignment.set(a.id, { assignment: a, count: 1, groupName: g?.name || "" });
    }
  });
  const pendingList = Array.from(pendingByAssignment.values());

  return (
    <ProtectTeacherRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-teal-700 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex items-center gap-3 mb-1">
              <BookOpen className="w-5 h-5 opacity-80" />
              <span className="text-xs font-medium uppercase tracking-widest opacity-80">Espace enseignant</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Bonjour{teacherName ? `, ${teacherName}` : ""}
            </h1>
            <p className="text-teal-100 text-sm mt-1">Suivez vos groupes, corrigez les devoirs et préparez vos contenus</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-7 h-7 animate-spin text-teal-700" />
            </div>
          ) : (
            <>
              {/* ── Stats ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-teal-50 rounded-2xl p-4">
                  <Users className="w-5 h-5 text-teal-700 mb-1.5" />
                  <p className="text-2xl font-bold text-teal-700">{groups.length}</p>
                  <p className="text-xs text-gray-600">Groupe{groups.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="bg-blue-50 rounded-2xl p-4">
                  <Users className="w-5 h-5 text-blue-600 mb-1.5" />
                  <p className="text-2xl font-bold text-blue-600">{totalStudents}</p>
                  <p className="text-xs text-gray-600">Élève{totalStudents !== 1 ? "s" : ""}</p>
                </div>
                <div className={`rounded-2xl p-4 ${pendingCorrections.length > 0 ? "bg-amber-50 ring-1 ring-amber-200" : "bg-gray-50"}`}>
                  <ClipboardCheck className={`w-5 h-5 mb-1.5 ${pendingCorrections.length > 0 ? "text-amber-600" : "text-gray-400"}`} />
                  <p className={`text-2xl font-bold ${pendingCorrections.length > 0 ? "text-amber-600" : "text-gray-400"}`}>{pendingCorrections.length}</p>
                  <p className="text-xs text-gray-600">À corriger</p>
                </div>
                <div className="bg-green-50 rounded-2xl p-4">
                  <Check className="w-5 h-5 text-green-600 mb-1.5" />
                  <p className="text-2xl font-bold text-green-600">{correctedCount}</p>
                  <p className="text-xs text-gray-600">Corrigé{correctedCount !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {/* ── À corriger (visible seulement s'il y en a) ── */}
              {pendingList.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-700">
                      Devoirs à corriger ({pendingCorrections.length})
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {pendingList.map(({ assignment, count, groupName }) => (
                      <div
                        key={assignment.id}
                        onClick={() => router.push(`/teacher/groupes/${assignment.groupId}`)}
                        className="bg-white border border-amber-100 rounded-2xl px-5 py-3 flex items-center justify-between cursor-pointer hover:shadow-sm transition group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                            <ClipboardCheck className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 text-sm truncate">{assignment.title}</p>
                            <p className="text-xs text-gray-500">{groupName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            {count} copie{count !== 1 ? "s" : ""}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-amber-600 transition" />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Actions rapides ── */}
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">Actions rapides</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/teacher/resources")}
                    className="bg-white border border-gray-100 rounded-2xl p-4 text-left hover:border-teal-200 hover:shadow-sm transition group flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition">
                      <FolderOpen className="w-5 h-5 text-teal-700" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Ma bibliothèque</p>
                      <p className="text-xs text-gray-500">Préparer cours, devoirs et exercices</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="bg-white border border-gray-100 rounded-2xl p-4 text-left hover:border-teal-200 hover:shadow-sm transition group flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition">
                      <Plus className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Créer un groupe</p>
                      <p className="text-xs text-gray-500">Ajouter une nouvelle classe ou section</p>
                    </div>
                  </button>
                </div>
              </section>

              {/* ── Mes groupes ── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Mes groupes</h2>
                </div>

                {/* Create form */}
                {showForm && (
                  <div className="bg-white border border-teal-100 rounded-2xl p-4 mb-4 flex gap-3">
                    <input
                      autoFocus
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      placeholder="Nom du groupe (ex : Terminale C, Groupe maths…)"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={creating || !newGroupName.trim()}
                      className="bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-50 flex items-center gap-1"
                    >
                      {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Créer
                    </button>
                    <button type="button" title="Annuler" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
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
                      const groupAssignments = assignments.filter((a) => a.groupId === g.id);
                      const groupPending = submissions.filter(
                        (s) => s.status === "submitted" && groupAssignments.some((a) => a.id === s.assignmentId)
                      ).length;

                      return (
                        <div key={g.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className="flex items-center justify-between px-5 py-4">
                            {renamingId === g.id ? (
                              <div className="flex items-center gap-2 flex-1 mr-4">
                                <input
                                  autoFocus
                                  type="text"
                                  title="Nouveau nom du groupe"
                                  placeholder="Nouveau nom…"
                                  value={renameVal}
                                  onChange={(e) => setRenameVal(e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && handleRename(g.id)}
                                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-teal-500"
                                />
                                <button type="button" title="Confirmer le renommage" onClick={() => handleRename(g.id)} className="text-teal-700 hover:text-teal-900">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button type="button" title="Annuler" onClick={() => setRenamingId(null)} className="text-gray-400 hover:text-gray-600">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-4 flex-1 cursor-pointer group"
                                onClick={() => router.push(`/teacher/groupes/${g.id}`)}
                              >
                                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                                  <Users className="w-5 h-5 text-teal-700" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 group-hover:text-teal-700 transition">{g.name}</p>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-xs text-gray-500">
                                      {g.studentIds.length} élève{g.studentIds.length !== 1 ? "s" : ""}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {groupAssignments.length} travai{groupAssignments.length !== 1 ? "ux assignés" : "l assigné"}
                                    </span>
                                    {groupPending > 0 && (
                                      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {groupPending} à corriger
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => router.push(`/teacher/groupes/${g.id}`)}
                                className="bg-teal-50 text-teal-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-teal-100 transition"
                              >
                                Ouvrir
                              </button>
                              <button type="button" title="Renommer" onClick={() => { setRenamingId(g.id); setRenameVal(g.name); }}
                                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button type="button" title="Supprimer le groupe" onClick={() => handleDelete(g.id)}
                                className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </ProtectTeacherRoute>
  );
}

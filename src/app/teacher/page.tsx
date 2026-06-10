"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  Users, Plus, BookOpen, Loader2, Trash2, Pencil, X, Check, Library,
} from "lucide-react";
import ProtectTeacherRoute from "@/components/auth/ProtectTeacherRoute";
import {
  getTeacherGroups,
  createGroup,
  deleteGroup,
  renameGroup,
} from "@/helpers/teacherFetchers";
import type { Group } from "@/type/teacher";

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
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
      const g = await getTeacherGroups(user.uid);
      setGroups(g);
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
              Bonjour{teacherName ? `, ${teacherName}` : ""} 👋
            </h1>
            <p className="text-teal-100 text-sm mt-1">Gérez vos groupes, ressources et suivez la progression de vos élèves</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-teal-50 rounded-2xl p-4">
              <Users className="w-5 h-5 text-teal-700 mb-2" />
              <p className="text-2xl font-bold text-teal-700">{groups.length}</p>
              <p className="text-xs text-gray-600">Groupe(s)</p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4">
              <Users className="w-5 h-5 text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-600">
                {groups.reduce((sum, g) => sum + g.studentIds.length, 0)}
              </p>
              <p className="text-xs text-gray-600">Élève(s) au total</p>
            </div>
            {/* Resources shortcut */}
            <button
              type="button"
              onClick={() => router.push("/teacher/resources")}
              className="bg-amber-50 rounded-2xl p-4 text-left hover:bg-amber-100 transition group"
            >
              <Library className="w-5 h-5 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-bold text-amber-700">Mes ressources</p>
              <p className="text-xs text-gray-500 mt-0.5">Devoirs, exercices, quiz</p>
            </button>
          </div>

          {/* Groups list */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Mes groupes</h2>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-teal-800 transition"
            >
              <Plus className="w-4 h-4" />
              Nouveau groupe
            </button>
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
                placeholder="Nom du groupe (ex: Terminale C, Groupe maths…)"
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
              <button
                type="button"
                title="Annuler"
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-7 h-7 animate-spin text-teal-700" />
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 font-semibold mb-1">Aucun groupe pour l'instant</p>
              <p className="text-gray-400 text-sm">Créez votre premier groupe pour commencer à assigner des contenus.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
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
                        className="flex items-center gap-4 flex-1 cursor-pointer"
                        onClick={() => router.push(`/teacher/groupes/${g.id}`)}
                      >
                        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-teal-700" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{g.name}</p>
                          <p className="text-xs text-gray-500">
                            {g.studentIds.length} élève{g.studentIds.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => router.push(`/teacher/groupes/${g.id}`)}
                        className="bg-teal-50 text-teal-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-teal-100 transition"
                      >
                        Gérer
                      </button>
                      <button
                        type="button"
                        title="Renommer"
                        onClick={() => { setRenamingId(g.id); setRenameVal(g.name); }}
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Supprimer le groupe"
                        onClick={() => handleDelete(g.id)}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectTeacherRoute>
  );
}

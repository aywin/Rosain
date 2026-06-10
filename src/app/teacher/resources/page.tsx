"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import {
  ArrowLeft, Plus, Trash2, BookOpen, FileText, ClipboardList,
  Loader2, X, Check, Upload, Library, ChevronDown, ChevronUp, Pencil,
} from "lucide-react";
import ProtectTeacherRoute from "@/components/auth/ProtectTeacherRoute";
import QuizBuilder from "@/components/teacher/QuizBuilder";
import {
  createTeacherContent,
  getTeacherContent,
  deleteTeacherContent,
  updateTeacherContent,
} from "@/helpers/teacherFetchers";
import type { TeacherContent, QuizQuestion } from "@/type/teacher";

type ContentType = "cours" | "devoir" | "exercise";

const TYPE_LABELS: Record<ContentType, string> = {
  cours: "Cours",
  devoir: "Devoir",
  exercise: "Exercice",
};
const TYPE_ICONS: Record<ContentType, React.ReactNode> = {
  cours: <BookOpen className="w-4 h-4" />,
  devoir: <ClipboardList className="w-4 h-4" />,
  exercise: <FileText className="w-4 h-4" />,
};
const TYPE_COLORS: Record<ContentType, string> = {
  cours: "bg-blue-50 text-blue-700",
  devoir: "bg-teal-50 text-teal-700",
  exercise: "bg-green-50 text-green-700",
};

export default function TeacherResourcesPage() {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [myContent, setMyContent] = useState<TeacherContent[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<ContentType>("cours");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formQuestions, setFormQuestions] = useState<QuizQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      setTeacherId(user.uid);
      const content = await getTeacherContent(user.uid);
      setMyContent(content);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setFormTitle(""); setFormDesc(""); setFormQuestions([]);
    setFormType("cours"); setEditingId(null); setShowForm(false);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !teacherId) return;
    setSaving(true);
    if (editingId) {
      await updateTeacherContent(editingId, {
        title: formTitle.trim(),
        description: formDesc.trim(),
        type: formType,
        questions: formQuestions,
      });
      setMyContent((prev) => prev.map((c) =>
        c.id === editingId
          ? { ...c, title: formTitle.trim(), description: formDesc.trim(), type: formType, questions: formQuestions }
          : c
      ));
    } else {
      const id = await createTeacherContent({
        teacherId,
        type: formType,
        title: formTitle.trim(),
        description: formDesc.trim(),
        questions: formQuestions,
      });
      setMyContent((prev) => [...prev, {
        id, teacherId, type: formType,
        title: formTitle.trim(), description: formDesc.trim(),
        questions: formQuestions, createdAt: null,
      }]);
    }
    resetForm();
    setSaving(false);
  };

  const handleEdit = (c: TeacherContent) => {
    setEditingId(c.id);
    setFormType(c.type);
    setFormTitle(c.title);
    setFormDesc(c.description);
    setFormQuestions(c.questions || []);
    setShowForm(true);
    setExpandedId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce contenu ?")) return;
    await deleteTeacherContent(id);
    setMyContent((prev) => prev.filter((c) => c.id !== id));
  };

  // Group by type for display
  const byType = (type: ContentType) => myContent.filter((c) => c.type === type);

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
              <ArrowLeft className="w-4 h-4" /> Espace enseignant
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Library className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Mes ressources</h1>
                <p className="text-teal-100 text-sm">Cours, devoirs et exercices que vous créez</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* Create / Edit form */}
          {showForm ? (
            <div className="bg-white border border-teal-100 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-800">{editingId ? "Modifier le contenu" : "Nouveau contenu"}</p>
                <button type="button" title="Annuler" onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Type selector */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Type de contenu</label>
                <div className="flex gap-2 flex-wrap">
                  {(["cours", "devoir", "exercise"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormType(t)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                        formType === t
                          ? "bg-teal-700 text-white border-teal-700"
                          : "bg-white text-gray-600 border-gray-200 hover:border-teal-400"
                      }`}
                    >
                      {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Titre *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={
                    formType === "cours"
                      ? "Ex : Introduction à l'algèbre, Leçon sur la photosynthèse…"
                      : formType === "devoir"
                      ? "Ex : Devoir de mathématiques n°1…"
                      : "Ex : Exercice sur les fractions…"
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  {formType === "cours" ? "Contenu / Résumé" : "Consignes / Description"}
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={4}
                  placeholder={
                    formType === "cours"
                      ? "Rédigez le contenu du cours ici. Le support PDF sera disponible bientôt…"
                      : "Décrivez les attentes, les critères d'évaluation…"
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none"
                />
              </div>

              {/* PDF placeholder */}
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Upload className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {formType === "cours" ? "Fichier PDF du cours" : "Fichier PDF / Pièce jointe"}
                    </p>
                    <p className="text-xs text-gray-400">
                      Bientôt disponible — l'upload sera intégré avec le stockage fichiers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quiz builder — pour devoir et exercice uniquement */}
              {(formType === "devoir" || formType === "exercise") && (
                <div className="border-t border-gray-100 pt-4">
                  <QuizBuilder questions={formQuestions} onChange={setFormQuestions} />
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !formTitle.trim()}
                className="w-full bg-teal-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingId ? "Enregistrer les modifications" : "Créer ce contenu"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {myContent.length} ressource{myContent.length !== 1 ? "s" : ""} créée{myContent.length !== 1 ? "s" : ""}
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-teal-800 transition"
              >
                <Plus className="w-4 h-4" /> Créer un contenu
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
            </div>
          ) : myContent.length === 0 && !showForm ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Library className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 font-semibold mb-1">Aucune ressource pour l'instant</p>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                Créez vos cours, devoirs et exercices ici. Ils seront disponibles lors de la création d'assignements dans vos groupes.
              </p>
            </div>
          ) : (
            /* Content grouped by type */
            <div className="space-y-8">
              {(["cours", "devoir", "exercise"] as const).map((type) => {
                const items = byType(type);
                if (items.length === 0) return null;
                return (
                  <section key={type}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${TYPE_COLORS[type]}`}>
                        {TYPE_ICONS[type]}
                      </span>
                      <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
                        {TYPE_LABELS[type]}s ({items.length})
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {items.map((c) => (
                        <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className="flex items-center justify-between px-5 py-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${TYPE_COLORS[c.type]}`}>
                                {TYPE_ICONS[c.type]}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800 text-sm truncate">{c.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[c.type]}`}>
                                    {TYPE_LABELS[c.type]}
                                  </span>
                                  {(c.questions?.length || 0) > 0 && (
                                    <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">
                                      {c.questions.length} question{c.questions.length > 1 ? "s" : ""}
                                    </span>
                                  )}
                                  {c.type === "cours" && (
                                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                      <Upload className="w-2.5 h-2.5" /> PDF bientôt
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                title="Modifier"
                                onClick={() => handleEdit(c)}
                                className="text-gray-400 hover:text-teal-600 p-1.5 rounded-lg hover:bg-teal-50 transition"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                title="Supprimer"
                                onClick={() => handleDelete(c.id)}
                                className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                title={expandedId === c.id ? "Réduire" : "Aperçu"}
                                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                                className="text-gray-400 hover:text-gray-600 p-1.5 transition"
                              >
                                {expandedId === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Aperçu */}
                          {expandedId === c.id && (
                            <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50 space-y-3">
                              {c.description && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-1">
                                    {c.type === "cours" ? "Contenu" : "Consignes"}
                                  </p>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.description}</p>
                                </div>
                              )}
                              {c.type === "cours" && (
                                <div className="flex items-center gap-2 text-xs text-gray-400 bg-white rounded-lg px-3 py-2 border border-dashed border-gray-200">
                                  <Upload className="w-3.5 h-3.5" />
                                  Support PDF — disponible après intégration du stockage fichiers
                                </div>
                              )}
                              {(c.questions?.length || 0) > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-2">Quiz ({c.questions.length} questions)</p>
                                  <div className="space-y-2">
                                    {c.questions.map((q, i) => (
                                      <div key={i} className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                                        <p className="text-xs font-semibold text-gray-700 mb-1">Q{i + 1}. {q.text}</p>
                                        <ul className="space-y-0.5">
                                          {q.options.map((opt, oi) => (
                                            <li
                                              key={oi}
                                              className={`text-xs flex items-center gap-1.5 ${oi === q.correctIndex ? "text-green-700 font-semibold" : "text-gray-500"}`}
                                            >
                                              {oi === q.correctIndex
                                                ? <Check className="w-3 h-3 flex-shrink-0" />
                                                : <span className="w-3 h-3 flex-shrink-0" />}
                                              {opt}
                                            </li>
                                          ))}
                                        </ul>
                                        {q.requireJustification && (
                                          <p className="text-xs text-amber-600 mt-1">Justification requise</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectTeacherRoute>
  );
}

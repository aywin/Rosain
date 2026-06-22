"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import {
  ArrowLeft, Plus, Trash2, BookOpen, FileText, ClipboardList,
  Loader2, X, Check, Library, ChevronDown, ChevronUp, Pencil, Eye,
} from "lucide-react";
import ProtectTeacherRoute from "@/components/auth/ProtectTeacherRoute";
import QuizBuilder from "@/components/teacher/QuizBuilder";
import FileUploadZone from "@/components/teacher/FileUploadZone";
import {
  createTeacherContent,
  getTeacherContent,
  deleteTeacherContent,
  updateTeacherContent,
} from "@/helpers/teacherFetchers";
import { storagePaths } from "@/helpers/storageHelpers";
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

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<ContentType>("cours");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formQuestions, setFormQuestions] = useState<QuizQuestion[]>([]);
  const [formFileUrl, setFormFileUrl] = useState<string | null>(null);
  const [formFileName, setFormFileName] = useState<string | null>(null);
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
    setFormFileUrl(null); setFormFileName(null);
    setFormType("cours"); setEditingId(null); setShowForm(false);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !teacherId) return;
    setSaving(true);
    const payload = {
      title: formTitle.trim(),
      description: formDesc.trim(),
      type: formType,
      questions: formQuestions,
      fileUrl: formFileUrl || undefined,
      fileName: formFileName || undefined,
    };
    if (editingId) {
      await updateTeacherContent(editingId, payload);
      setMyContent((prev) => prev.map((c) =>
        c.id === editingId ? { ...c, ...payload } : c
      ));
    } else {
      const id = await createTeacherContent({ teacherId, ...payload });
      setMyContent((prev) => [...prev, { id, teacherId, ...payload, createdAt: null } as TeacherContent]);
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
    setFormFileUrl((c as any).fileUrl || null);
    setFormFileName((c as any).fileName || null);
    setShowForm(true);
    setExpandedId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce contenu ?")) return;
    await deleteTeacherContent(id);
    setMyContent((prev) => prev.filter((c) => c.id !== id));
  };

  const byType = (type: ContentType) => myContent.filter((c) => c.type === type);

  // Storage path for the upload zone — uses a temp ID while creating, real ID when editing
  const uploadPath = teacherId
    ? storagePaths.teacherResource(teacherId, editingId || "draft", "")
    : "";

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
                <h1 className="text-xl font-bold">Ma bibliothèque</h1>
                <p className="text-teal-100 text-sm">Préparez vos cours, devoirs et exercices avant de les assigner</p>
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

              {/* Type */}
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
                  {formType === "cours" ? "Contenu / Résumé (texte)" : "Consignes / Description"}
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={4}
                  placeholder={
                    formType === "cours"
                      ? "Rédigez ici un résumé ou le contenu textuel du cours…"
                      : "Décrivez les attentes, les critères d'évaluation…"
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none"
                />
              </div>

              {/* File upload */}
              {teacherId && (
                <FileUploadZone
                  storagePath={uploadPath}
                  accept={formType === "cours" ? "pdf" : "pdfAndImages"}
                  label={
                    formType === "cours"
                      ? "Support PDF du cours (optionnel)"
                      : formType === "devoir"
                      ? "Fichier joint au devoir (PDF, image)"
                      : "Énoncé de l'exercice (PDF, image)"
                  }
                  initialUrl={formFileUrl || undefined}
                  initialName={formFileName || undefined}
                  onUploadComplete={(url, name) => { setFormFileUrl(url); setFormFileName(name); }}
                  onRemove={() => { setFormFileUrl(null); setFormFileName(null); }}
                />
              )}

              {/* Quiz builder — devoir + exercice uniquement */}
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
                {myContent.length} contenu{myContent.length !== 1 ? "s" : ""} dans votre bibliothèque
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
              <p className="text-gray-700 font-semibold mb-1">Votre bibliothèque est vide</p>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                Préparez vos cours (PDF), devoirs et exercices ici. Vous pourrez ensuite les assigner à vos groupes.
              </p>
            </div>
          ) : (
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
                      {items.map((c) => {
                        const hasFile = !!(c as any).fileUrl;
                        return (
                          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${TYPE_COLORS[c.type]}`}>
                                  {TYPE_ICONS[c.type]}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-800 text-sm truncate">{c.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[c.type]}`}>
                                      {TYPE_LABELS[c.type]}
                                    </span>
                                    {hasFile && (
                                      <a
                                        href={(c as any).fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs bg-blue-50 text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded-full flex items-center gap-1 transition"
                                      >
                                        <Eye className="w-2.5 h-2.5" /> {(c as any).fileName || "PDF"}
                                      </a>
                                    )}
                                    {(c.questions?.length || 0) > 0 && (
                                      <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">
                                        {c.questions.length}Q quiz
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button type="button" title="Modifier" onClick={() => handleEdit(c)}
                                  className="text-gray-400 hover:text-teal-600 p-1.5 rounded-lg hover:bg-teal-50 transition">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button type="button" title="Supprimer" onClick={() => handleDelete(c.id)}
                                  className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button type="button" title={expandedId === c.id ? "Réduire" : "Aperçu"}
                                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                                  className="text-gray-400 hover:text-gray-600 p-1.5 transition">
                                  {expandedId === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

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
                                {hasFile && (
                                  <a
                                    href={(c as any).fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg px-3 py-2 transition w-fit"
                                  >
                                    <Eye className="w-4 h-4" />
                                    Ouvrir {(c as any).fileName || "le fichier"}
                                  </a>
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
                                              <li key={oi} className={`text-xs flex items-center gap-1.5 ${oi === q.correctIndex ? "text-green-700 font-semibold" : "text-gray-500"}`}>
                                                {oi === q.correctIndex ? <Check className="w-3 h-3 flex-shrink-0" /> : <span className="w-3 h-3 flex-shrink-0" />}
                                                {opt}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
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

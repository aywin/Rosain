"use client";
import { useState, useEffect } from "react";
import { ExoFormState } from "@/components/types";
import CourseSelectors from "./CourseSelector";
import LatexPreview from "./LatexPreview";
import FileInputList from "./FileInputList";
import { db } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

interface ExoFormProps {
  onSubmit: (data: any) => Promise<void> | void;
  initial?: Partial<ExoFormState>;
  editMode?: boolean;
  onCancel?: () => void;
}

export default function ExoForm({
  onSubmit,
  initial = {},
  editMode = false,
  onCancel,
}: ExoFormProps) {
  const [formState, setFormState] = useState<ExoFormState>({
    title: initial.title || "",
    description: initial.description || "",
    level_id: initial.level_id || "",
    subject_id: initial.subject_id || "",
    course_id: initial.course_id || "",
    order: initial.order || 0,
    difficulty: initial.difficulty || "moyen",
    statement_text: initial.statement_text || "",
    statement_files: initial.statement_files || [""],
    solution_text: initial.solution_text || "",
    solution_files: initial.solution_files || [""],
    tags: initial.tags || [],
  });

  // 🔎 Chercher le plus petit ordre dispo dans un cours
  const fetchNextOrder = async (courseId: string) => {
    if (!courseId) return;

    const q = query(
      collection(db, "exercises"), // ta collection Firestore
      where("course_id", "==", courseId)
    );
    const snapshot = await getDocs(q);

    const usedOrders = snapshot.docs.map((doc) => doc.data().order as number);

    let next = 1;
    while (usedOrders.includes(next)) {
      next++;
    }

    setFormState((prev) => ({ ...prev, order: next }));
  };

  // ⚡ Recalcul de l’ordre quand on change de cours
  useEffect(() => {
    if (formState.course_id && !editMode) {
      fetchNextOrder(formState.course_id);
    }
  }, [formState.course_id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formState.title.trim() || !formState.course_id) return;

    const tags =
      typeof formState.tags === "string"
        ? formState.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : formState.tags;

    await onSubmit({ ...formState, tags });

    if (!editMode) {
      setFormState({
        title: "",
        description: "",
        level_id: "",
        subject_id: "",
        course_id: "",
        order: 0,
        difficulty: "moyen",
        statement_text: "",
        statement_files: [""],
        solution_text: "",
        solution_files: [""],
        tags: [],
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-4">
      {/* Champ titre */}
      <input
        className="border px-3 py-1 rounded w-full"
        type="text"
        placeholder="Titre de l'exercice"
        value={formState.title}
        onChange={(e) =>
          setFormState((prev) => ({ ...prev, title: e.target.value }))
        }
        required
      />

      {/* Description */}
      <textarea
        className="border px-3 py-1 rounded w-full"
        placeholder="Description"
        value={formState.description}
        onChange={(e) =>
          setFormState((prev) => ({ ...prev, description: e.target.value }))
        }
      />

      {/* Sélecteurs Niveau, Matière, Cours */}
      <CourseSelectors
        levelId={formState.level_id}
        subjectId={formState.subject_id}
        courseId={formState.course_id}
        setFormState={setFormState}
      />

      <div className="flex flex-wrap gap-2 items-end">
        {/* Ordre */}
        <div className="flex flex-col">
          <label className="text-sm font-medium">Ordre</label>
          <input
            className="border px-2 py-1 rounded w-20"
            type="number"
            value={formState.order}
            readOnly // 🔒 auto-rempli
          />
        </div>

        {/* Difficulté */}
        <div className="flex flex-col">
          <label className="text-sm font-medium">Difficulté</label>
          <select
            className="border px-2 py-1 rounded w-28"
            value={formState.difficulty}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                difficulty: e.target.value as any,
              }))
            }
          >
            <option value="facile">Facile</option>
            <option value="moyen">Moyen</option>
            <option value="difficile">Difficile</option>
          </select>
        </div>

        {/* Tags */}
        <div className="flex flex-col flex-1">
          <label className="text-sm font-medium">Tags</label>
          <input
            className="border px-2 py-1 rounded w-full"
            type="text"
            placeholder="séparés par virgules"
            value={
              typeof formState.tags === "string"
                ? formState.tags
                : formState.tags.join(", ")
            }
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, tags: e.target.value }))
            }
          />
        </div>
      </div>

      {/* Énoncé */}
      <LatexPreview
        label="Texte de l'énoncé :"
        value={formState.statement_text}
        onChange={(v) =>
          setFormState((prev) => ({ ...prev, statement_text: v }))
        }
        placeholder="Texte de l'énoncé (support LaTeX avec $...$ ou $$...$$)"
      />
      {/* Fichiers Énoncé */}

      <FileInputList
        label="Lien(s) fichier(s) énoncé"
        files={formState.statement_files}
        onChange={(files) =>
          setFormState((prev) => ({ ...prev, statement_files: files }))
        }
      />

      {/* Solution */}
      <LatexPreview
        label="Solution :"
        value={formState.solution_text}
        onChange={(v) =>
          setFormState((prev) => ({ ...prev, solution_text: v }))
        }
        placeholder="Solution (texte, LaTeX supporté)"
      />
     

      {/* Fichiers Solution */}
      <FileInputList
        label="Lien(s) fichier(s) solution"
        files={formState.solution_files}
        onChange={(files) =>
          setFormState((prev) => ({ ...prev, solution_files: files }))
        }
      />

      {/* Boutons */}
      <div className="flex gap-2">
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded"
          type="submit"
        >
          {editMode ? "Sauvegarder" : "Ajouter"}
        </button>
        {editMode && onCancel && (
          <button
            className="bg-gray-200 px-2 py-1 rounded"
            type="button"
            onClick={onCancel}
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}

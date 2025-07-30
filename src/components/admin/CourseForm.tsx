"use client";
import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, getDocs, DocumentData } from "firebase/firestore";

interface Level {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface CourseFormProps {
  onSubmit: (data: { title: string; description: string; level_id: string; subject_id: string }) => Promise<void> | void;
  initial?: { title?: string; description?: string; level_id?: string; subject_id?: string };
  editMode?: boolean;
  onCancel?: () => void; // Rendu optionnel
}

interface CourseFormState {
  title: string;
  description: string;
  level_id: string;
  subject_id: string;
}

export default function CourseForm({ onSubmit, initial = {}, editMode = false, onCancel }: CourseFormProps) {
  const [formState, setFormState] = useState<CourseFormState>({
    title: initial.title || "",
    description: initial.description || "",
    level_id: initial.level_id || "",
    subject_id: initial.subject_id || "",
  });
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const levelsSnap = await getDocs(collection(db, "levels"));
      setLevels(levelsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Level)));
      const subjectsSnap = await getDocs(collection(db, "subjects"));
      setSubjects(subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Subject)));
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (editMode) {
      setFormState((prev) => ({
        ...prev,
        title: initial.title || "",
        description: initial.description || "",
        level_id: initial.level_id || "",
        subject_id: initial.subject_id || "",
      }));
    }
  }, [initial, editMode]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formState.title.trim() || !formState.level_id || !formState.subject_id) return;
    await onSubmit({
      title: formState.title,
      description: formState.description,
      level_id: formState.level_id,
      subject_id: formState.subject_id,
    });
    if (!editMode) {
      setFormState({
        title: "",
        description: "",
        level_id: "",
        subject_id: "",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-4">
      <input
        className="border px-3 py-2 rounded"
        type="text"
        placeholder="Titre du cours"
        value={formState.title}
        onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
        required
      />
      <textarea
        className="border px-3 py-2 rounded"
        placeholder="Description du cours"
        value={formState.description}
        onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
      />
      <select
        className="border px-3 py-2 rounded"
        value={formState.level_id}
        onChange={(e) => setFormState((prev) => ({ ...prev, level_id: e.target.value }))}
        required
      >
        <option value="">Sélectionner un niveau</option>
        {levels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <select
        className="border px-3 py-2 rounded"
        value={formState.subject_id}
        onChange={(e) => setFormState((prev) => ({ ...prev, subject_id: e.target.value }))}
        required
      >
        <option value="">Sélectionner un sujet</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">
          {editMode ? "Sauvegarder" : "Ajouter"}
        </button>
        {editMode && onCancel && (
          <button className="bg-gray-200 px-3 py-2 rounded" type="button" onClick={onCancel}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
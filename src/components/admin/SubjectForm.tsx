"use client";
import { useState, useEffect } from "react";

interface SubjectFormProps {
  onSubmit: (name: string) => Promise<void> | void;
  initialValue?: string;
  editMode?: boolean;
  onCancel?: () => void;
}

export default function SubjectForm({ onSubmit, initialValue = "", editMode = false, onCancel }: SubjectFormProps) {
  const [name, setName] = useState(initialValue);

  useEffect(() => {
    if (editMode) {
      setName(initialValue);
    }
  }, [initialValue, editMode]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit(name);
    if (!editMode) {
      setName("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        className="border px-3 py-2 rounded"
        type="text"
        placeholder="Nom du sujet"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">
        {editMode ? "Sauvegarder" : "Ajouter"}
      </button>
      {editMode && onCancel && (
        <button className="bg-gray-200 px-3 py-2 rounded" type="button" onClick={onCancel}>
          Annuler
        </button>
      )}
    </form>
  );
}
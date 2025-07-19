"use client";
import { useState } from "react";

export default function LevelForm({ onSubmit, initialValue = "", editMode = false, onCancel }) {
  const [name, setName] = useState(initialValue);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name);
    setName("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        className="border px-3 py-2 rounded"
        type="text"
        placeholder="Nom du niveau"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">
        {editMode ? "Enregistrer" : "Ajouter"}
      </button>
      {editMode && (
        <button className="bg-gray-200 px-3 py-2 rounded" type="button" onClick={onCancel}>Annuler</button>
      )}
    </form>
  );
}

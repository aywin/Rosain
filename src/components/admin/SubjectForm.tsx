"use client";
import { useState } from "react";

export default function SubjectForm({ onSubmit, initialValue = "", editMode = false, onCancel }) {
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
        placeholder="Subject name"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">
        {editMode ? "Save" : "Add"}
      </button>
      {editMode && (
        <button className="bg-gray-200 px-3 py-2 rounded" type="button" onClick={onCancel}>Cancel</button>
      )}
    </form>
  );
}

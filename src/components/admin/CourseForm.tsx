"use client";
import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function CourseForm({ onSubmit, initial = {}, editMode = false, onCancel }) {
  const [title, setTitle] = useState(initial.title || "");
  const [description, setDescription] = useState(initial.description || "");
  const [levelId, setLevelId] = useState(initial.level_id || "");
  const [subjectId, setSubjectId] = useState(initial.subject_id || "");
  const [levels, setLevels] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const levelsSnap = await getDocs(collection(db, "levels"));
      setLevels(levelsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const subjectsSnap = await getDocs(collection(db, "subjects"));
      setSubjects(subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    })();
  }, []);

  useEffect(() => {
    if (editMode) {
      setTitle(initial.title || "");
      setDescription(initial.description || "");
      setLevelId(initial.level_id || "");
      setSubjectId(initial.subject_id || "");
    }
    // Pas de reset si ajout !
  }, [initial, editMode]);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!title.trim() || !levelId || !subjectId) return;
    onSubmit({
      title,
      description,
      level_id: levelId,
      subject_id: subjectId,
    });
    // Reset SEULEMENT si on ajoute (pas en édition)
    if (!editMode) {
      setTitle(""); setDescription(""); setLevelId(""); setSubjectId("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-4">
      <input
        className="border px-3 py-2 rounded"
        type="text"
        placeholder="Course title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
      />
      <textarea
        className="border px-3 py-2 rounded"
        placeholder="Course description"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <select className="border px-3 py-2 rounded" value={levelId} onChange={e => setLevelId(e.target.value)} required>
        <option value="">Select level</option>
        {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      <select className="border px-3 py-2 rounded" value={subjectId} onChange={e => setSubjectId(e.target.value)} required>
        <option value="">Select subject</option>
        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <div className="flex gap-2">
        <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">
          {editMode ? "Save" : "Add"}
        </button>
        {editMode && (
          <button className="bg-gray-200 px-3 py-2 rounded" type="button" onClick={onCancel}>Cancel</button>
        )}
      </div>
    </form>
  );
}

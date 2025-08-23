'use client';

import { useState } from 'react';
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ExoForm({ subjects, levels, courses, onAdded }: any) {
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [course, setCourse] = useState('');
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [solution, setSolution] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await addDoc(collection(db, 'exercises'), {
      subject,
      level,
      course,
      title,
      statement,
      solution,
      createdAt: serverTimestamp(),
    });

    onAdded?.();
    setTitle('');
    setStatement('');
    setSolution('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-2 border rounded">
        <option value="">-- Choisir matière --</option>
        {subjects.map((s: any) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full p-2 border rounded">
        <option value="">-- Choisir niveau --</option>
        {levels.map((l: any) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>

      <select value={course} onChange={(e) => setCourse(e.target.value)} className="w-full p-2 border rounded">
        <option value="">-- Choisir cours --</option>
        {courses.map((c: any) => (
          <option key={c.id} value={c.id}>{c.title}</option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Titre de l'exercice"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-2 border rounded"
      />

      <textarea
        placeholder="Énoncé"
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        className="w-full p-2 border rounded"
      />

      <textarea
        placeholder="Solution"
        value={solution}
        onChange={(e) => setSolution(e.target.value)}
        className="w-full p-2 border rounded"
      />

      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
        Ajouter l'exercice
      </button>
    </form>
  );
}

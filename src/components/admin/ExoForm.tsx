'use client';

import { useState } from 'react';
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

export default function ExoForm({ subjects, levels, courses, onAdded }: any) {
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [course, setCourse] = useState('');
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [solution, setSolution] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const storage = getStorage();

  // 📸 Upload image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const storageRef = ref(storage, `exercises/${Date.now()}-${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    setImageUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await addDoc(collection(db, 'exercises'), {
      subject,
      level,
      course,
      title,
      statement,
      solution,
      imageUrl,
      createdAt: serverTimestamp(),
    });

    onAdded?.();
    setTitle('');
    setStatement('');
    setSolution('');
    setImageUrl('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Sélection matière */}
      <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-2 border rounded">
        <option value="">-- Choisir matière --</option>
        {subjects.map((s: any) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      {/* Sélection niveau */}
      <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full p-2 border rounded">
        <option value="">-- Choisir niveau --</option>
        {levels.map((l: any) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>

      {/* Sélection cours */}
      <select value={course} onChange={(e) => setCourse(e.target.value)} className="w-full p-2 border rounded">
        <option value="">-- Choisir cours --</option>
        {courses.map((c: any) => (
          <option key={c.id} value={c.id}>{c.title}</option>
        ))}
      </select>

      {/* Titre */}
      <input
        type="text"
        placeholder="Titre de l'exercice"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-2 border rounded"
      />

      {/* Enoncé avec preview LaTeX */}
      <textarea
        placeholder="Énoncé (LaTeX supporté, ex: x^2 - 5x + 6 = 0)"
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        className="w-full p-2 border rounded"
      />
      {statement && (
        <div className="p-2 bg-gray-100 rounded">
          <BlockMath math={statement} />
        </div>
      )}

      {/* Solution avec preview LaTeX */}
      <textarea
        placeholder="Solution (LaTeX supporté)"
        value={solution}
        onChange={(e) => setSolution(e.target.value)}
        className="w-full p-2 border rounded"
      />
      {solution && (
        <div className="p-2 bg-gray-100 rounded">
          <BlockMath math={solution} />
        </div>
      )}

      {/* Upload image */}
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      {imageUrl && <img src={imageUrl} alt="Aperçu" className="mt-2 max-h-48 rounded" />}

      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
        Ajouter l'exercice
      </button>
    </form>
  );
}

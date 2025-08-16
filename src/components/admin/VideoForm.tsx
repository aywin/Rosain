'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

interface Course {
  id: string;
  title: string;
}

interface VideoFormProps {
  courses: Course[];
  onVideoAdded: (courseId: string) => void;
}

export default function VideoForm({ courses, onVideoAdded }: VideoFormProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [courseId, setCourseId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url || !courseId) return;

    try {
      setLoading(true);
      await addDoc(collection(db, 'videos'), {
        title,
        url,
        courseId,
        createdAt: serverTimestamp(),
      });

      setTitle('');
      setUrl('');
      onVideoAdded(courseId);
    } catch (error) {
      console.error('Erreur ajout vidéo :', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-8">
      <input
        type="text"
        placeholder="Titre de la vidéo"
        className="border w-full p-2 rounded"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        type="text"
        placeholder="Lien YouTube"
        className="border w-full p-2 rounded"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <select
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
        className="border w-full p-2 rounded"
      >
        <option value="">-- Sélectionner un cours --</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? 'Ajout en cours...' : 'Ajouter la vidéo'}
      </button>
    </form>
  );
}

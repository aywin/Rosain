'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
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
  const [order, setOrder] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNextOrder = async () => {
      if (!courseId) {
        setOrder('');
        return;
      }
      const q = query(collection(db, 'videos'), where('courseId', '==', courseId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const maxOrder = Math.max(...snapshot.docs.map((d) => d.data().order || 0));
        setOrder(maxOrder + 1);
      } else {
        setOrder(1);
      }
    };

    fetchNextOrder();
  }, [courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url || !courseId || !order) return;

    try {
      setLoading(true);
      await addDoc(collection(db, 'videos'), {
        title,
        url,
        courseId,
        order,
        createdAt: serverTimestamp(),
      });

      setTitle('');
      setUrl('');
      setOrder('');
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
      <input
        type="number"
        placeholder="Numéro d'ordre"
        className="border w-full p-2 rounded"
        value={order}
        onChange={(e) => setOrder(Number(e.target.value))}
        min={1}
      />
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

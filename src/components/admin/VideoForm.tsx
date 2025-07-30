'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

interface Props {
  courseId: string;
  onAdd: () => void;
}

const VideoForm = ({ courseId, onAdd }: Props) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
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
      onAdd(); // Recharger la liste
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
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? 'Ajout...' : 'Ajouter la vidéo'}
      </button>
    </form>
  );
};

export default VideoForm;

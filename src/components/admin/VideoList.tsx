'use client';

import { useState } from 'react';
import { deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';

interface Video {
  id: string;
  title: string;
  url: string;
  courseId: string;
}

interface VideoListProps {
  videos: Video[];
  courseId: string;
  refreshVideos: (courseId: string) => void;
}

export default function VideoList({ videos, courseId, refreshVideos }: VideoListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer cette vidéo ?')) {
      await deleteDoc(doc(db, 'videos', id));
      refreshVideos(courseId);
    }
  };

  const handleEdit = (video: Video) => {
    setEditingId(video.id);
    setEditTitle(video.title);
    setEditUrl(video.url);
  };

  const handleSave = async () => {
    if (editingId) {
      await updateDoc(doc(db, 'videos', editingId), {
        title: editTitle,
        url: editUrl,
      });
      setEditingId(null);
      refreshVideos(courseId);
    }
  };

  return (
    <div className="space-y-6">
      {videos.map((video) => (
        <div key={video.id} className="border p-4 rounded shadow-sm space-y-2">
          {editingId === video.id ? (
            <>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="border p-1 w-full rounded"
              />
              <input
                type="text"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="border p-1 w-full rounded"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={handleSave} className="bg-green-500 text-white px-3 py-1 rounded">
                  Sauvegarder
                </button>
                <button onClick={() => setEditingId(null)} className="bg-gray-400 text-white px-3 py-1 rounded">
                  Annuler
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-bold text-lg">{video.title}</h3>
              <div className="w-[300px] h-[170px]">
                <iframe
                  className="w-full h-full"
                  src={video.url.replace('watch?v=', 'embed/')}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleEdit(video)} className="bg-blue-500 text-white px-3 py-1 rounded">
                  Modifier
                </button>
                <button onClick={() => handleDelete(video.id)} className="bg-red-500 text-white px-3 py-1 rounded">
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      ))}
      {videos.length === 0 && courseId && (
        <p className="text-gray-500">Aucune vidéo trouvée pour ce cours.</p>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/firebase'; // Assurez-vous que votre fichier firebase.ts exporte db

interface Video {
  id: string;
  title: string;
  url: string;
  courseId: string;
}

interface Course {
  id: string;
  title: string;
}

const AdminVideosPage = () => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [courseId, setCourseId] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  // Récupération des cours
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'courses'));
        const results: Course[] = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...(doc.data() as Omit<Course, 'id'>) });
        });
        setCourses(results);
      } catch (error) {
        console.error('Erreur chargement des cours :', error);
      }
    };

    fetchCourses();
  }, []);

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url || !courseId) return;

    try {
      setLoading(true);
      await addDoc(collection(db, 'videos'), {
        title,
        url,
        courseId,
        createdAt: serverTimestamp()
      });

      setTitle('');
      setUrl('');
      fetchVideos(courseId);
    } catch (error) {
      console.error('Erreur ajout vidéo :', error);
    } finally {
      setLoading(false);
    }
  };

  // Récupération des vidéos d'un cours
  const fetchVideos = async (id: string) => {
    try {
      const q = query(collection(db, 'videos'), where('courseId', '==', id));
      const querySnapshot = await getDocs(q);
      const results: Video[] = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...(doc.data() as Omit<Video, 'id'>) });
      });
      setVideos(results);
    } catch (error) {
      console.error('Erreur récupération vidéos :', error);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🎥 Gestion des vidéos YouTube</h1>

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
          placeholder="Lien YouTube (ex: https://youtube.com/watch?v=...)"
          className="border w-full p-2 rounded"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <select
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            fetchVideos(e.target.value);
          }}
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

      <h2 className="text-xl font-semibold mb-2">📺 Vidéos associées</h2>
      <div className="space-y-6">
        {videos.map((video) => (
          <div key={video.id} className="border p-4 rounded shadow-sm">
            <h3 className="font-bold text-lg">{video.title}</h3>
            <div className="aspect-video mt-2">
              <iframe
                className="w-full h-full"
                src={video.url.replace('watch?v=', 'embed/')}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        ))}
        {videos.length === 0 && courseId && (
          <p className="text-gray-500">Aucune vidéo trouvée pour ce cours.</p>
        )}
      </div>
    </div>
  );
};

export default AdminVideosPage;

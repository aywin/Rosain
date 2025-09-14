'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import VideoForm from '@/components/admin/VideoForm';
import VideoList from '@/components/admin/VideoList';

interface Video {
  id: string;
  title: string;
  url: string;
  courseId: string;
  order?: number;
}

interface Course {
  id: string;
  title: string;
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');

  // 🔄 Charger la liste des cours
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'courses'));
        setCourses(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Course, 'id'>),
          }))
        );
      } catch (err) {
        console.error('Erreur chargement cours :', err);
      }
    };
    fetchCourses();
  }, []);

  // 🔄 Charger les vidéos d’un cours sélectionné
  const fetchVideos = async (id: string) => {
    setCourseId(id);
    if (!id) return;
    try {
      const snapshot = await getDocs(collection(db, 'videos'));
      const filtered = snapshot.docs
        .map((doc, index) => ({
          id: doc.id,
          ...(doc.data() as Omit<Video, 'id'>),
          order: (doc.data() as Video).order ?? index + 1, // gérer absence de order
        }))
        .filter((v) => v.courseId === id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); // tri côté client

      setVideos(filtered);
    } catch (err) {
      console.error('Erreur chargement vidéos :', err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">🎥 Gestion des vidéos YouTube</h1>

      {/* Bloc Formulaire */}
      <div className="bg-white border rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4">➕ Ajouter une vidéo</h2>
        <VideoForm courses={courses} onVideoAdded={fetchVideos} />
      </div>

      {/* Bloc Liste */}
      <div className="bg-white border rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4">📂 Liste des vidéos</h2>

        <select
          value={courseId}
          onChange={(e) => fetchVideos(e.target.value)}
          className="border w-full p-2 rounded mb-4"
        >
          <option value="">-- Sélectionner un cours --</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>

        {/* La liste ne recharge plus les vidéos après chaque update */}
        <VideoList videos={videos} courseId={courseId} refreshVideos={fetchVideos} />
      </div>
    </div>
  );
}

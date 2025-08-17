'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
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

  useEffect(() => {
    const fetchCourses = async () => {
      const snapshot = await getDocs(collection(db, 'courses'));
      setCourses(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Course, 'id'>) })));
    };
    fetchCourses();
  }, []);

  const fetchVideos = async (id: string) => {
    setCourseId(id);
    if (!id) return;
    const q = query(
      collection(db, 'videos'),
      where('courseId', '==', id),
      orderBy('order', 'asc')
    );
    const querySnapshot = await getDocs(q);
    setVideos(querySnapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Video, 'id'>) })));
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

        <VideoList videos={videos} courseId={courseId} refreshVideos={fetchVideos} />
      </div>
    </div>
  );
}

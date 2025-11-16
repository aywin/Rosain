'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
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
  const [transcriptStatus, setTranscriptStatus] = useState('');

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

  // 🔹 Extraire l'ID YouTube de l'URL
  const getVideoId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  // 🔹 Récupérer la transcription via l'API
  const fetchTranscript = async (videoId: string) => {
    try {
      // ✅ Ajouter clean_math=true pour nettoyer à l'ajout
      const response = await fetch(
        `http://127.0.0.1:8000/get_youtube_transcript?video_id=${videoId}&clean_math=true`
      );
      const data = await response.json();

      if (data.success) {
        return data.transcript;
      } else {
        console.warn('Transcription non disponible:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Erreur récupération transcription:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url || !courseId || !order) return;

    try {
      setLoading(true);
      setTranscriptStatus('🎬 Ajout de la vidéo...');

      // 1️⃣ Ajouter la vidéo
      const videoRef = await addDoc(collection(db, 'videos'), {
        title,
        url,
        courseId,
        order,
        createdAt: serverTimestamp(),
      });

      // 2️⃣ Récupérer la transcription
      const videoId = getVideoId(url);
      if (videoId) {
        setTranscriptStatus('📝 Récupération de la transcription...');
        const transcript = await fetchTranscript(videoId);

        if (transcript) {
          setTranscriptStatus('💾 Enregistrement de la transcription...');

          // 3️⃣ Sauvegarder dans Firestore
          await setDoc(doc(db, 'transcripts', videoRef.id), {
            videoId: videoRef.id,
            youtubeId: videoId,
            courseId,
            transcript,
            createdAt: serverTimestamp(),
          });

          setTranscriptStatus('✅ Transcription ajoutée avec succès !');
        } else {
          setTranscriptStatus('⚠️ Vidéo ajoutée mais transcription non disponible');
        }
      }

      // 4️⃣ Reset du formulaire
      setTimeout(() => {
        setTitle('');
        setUrl('');
        setOrder('');
        setTranscriptStatus('');
        onVideoAdded(courseId);
      }, 2000);

    } catch (error) {
      console.error('Erreur ajout vidéo :', error);
      setTranscriptStatus('❌ Erreur lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-8 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold">Ajouter une vidéo</h3>

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
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 w-full"
      >
        {loading ? transcriptStatus : 'Ajouter la vidéo + Transcription'}
      </button>

      {transcriptStatus && !loading && (
        <div className={`p-3 rounded ${transcriptStatus.includes('✅') ? 'bg-green-50 text-green-800' :
          transcriptStatus.includes('⚠️') ? 'bg-yellow-50 text-yellow-800' :
            transcriptStatus.includes('❌') ? 'bg-red-50 text-red-800' :
              'bg-blue-50 text-blue-800'
          }`}>
          {transcriptStatus}
        </div>
      )}
    </form>
  );
}
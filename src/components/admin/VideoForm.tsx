'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { buildApiUrl, apiConfig } from '@/config/api';

interface Course {
  id: string;
  title: string;
}

interface VideoFormProps {
  courses: Course[];
  onVideoAdded: (courseId: string) => void;
}

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

const isValidSegment = (seg: any): seg is TranscriptSegment => {
  return (
    seg &&
    typeof seg.text === 'string' &&
    typeof seg.start === 'number' &&
    typeof seg.duration === 'number' &&
    seg.start >= 0 &&
    seg.duration > 0
  );
};

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

  const getVideoId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const fetchTranscript = async (videoId: string) => {
    try {
      // ✅ Utilisation de la config centralisée
      const apiUrl = buildApiUrl(apiConfig.endpoints.transcript.getYoutubeTranscript, {
        video_id: videoId,
        clean_math: 'true',
        format_for_mathjax: 'true',
      });

      const response = await fetch(apiUrl);

      if (!response.ok) {
        console.error('HTTP Error:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();

      if (data.success && data.segments) {
        const validSegments = data.segments.filter(isValidSegment);

        if (validSegments.length === 0) {
          console.warn('Aucun segment valide dans la réponse');
          return null;
        }

        if (validSegments.length < data.segments.length) {
          console.warn(
            `${data.segments.length - validSegments.length} segments invalides ignorés`
          );
        }

        return {
          segments: validSegments,
          language: data.language || 'unknown',
          isGenerated: data.is_generated ?? true,
          isMathJaxFormatted: data.is_mathjax_formatted ?? false,
          totalDuration: data.estimated_duration_sec || 0,
          totalSegments: validSegments.length,
        };
      } else {
        console.warn('Transcription indisponible:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Erreur appel API transcription:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url || !courseId || order === '') return;

    try {
      setLoading(true);
      setTranscriptStatus('Ajout de la vidéo en cours...');

      // 1. Ajouter la vidéo
      const videoRef = await addDoc(collection(db, 'videos'), {
        title,
        url,
        courseId,
        order: Number(order),
        createdAt: serverTimestamp(),
      });

      // 2. Récupérer la transcription
      const videoId = getVideoId(url);
      if (!videoId) {
        setTranscriptStatus('⚠️ URL YouTube invalide - Vidéo ajoutée sans transcription');
        setTimeout(() => {
          resetForm();
          onVideoAdded(courseId);
        }, 3000);
        return;
      }

      setTranscriptStatus('Récupération de la transcription YouTube...');
      const transcriptData = await fetchTranscript(videoId);

      if (transcriptData) {
        setTranscriptStatus('Formatage MathJax en cours...');

        // 3. Sauvegarder dans Firestore
        await setDoc(doc(db, 'transcripts', videoRef.id), {
          videoId: videoRef.id,
          youtubeId: videoId,
          courseId,
          segments: transcriptData.segments,
          language: transcriptData.language,
          isGenerated: transcriptData.isGenerated,
          isMathJaxFormatted: transcriptData.isMathJaxFormatted,
          totalDuration: transcriptData.totalDuration,
          totalSegments: transcriptData.totalSegments,
          createdAt: serverTimestamp(),
        });

        const qualityBadge = transcriptData.isGenerated ? '🤖 Auto' : '✍️ Manuelle';
        const mathBadge = transcriptData.isMathJaxFormatted ? ' + 📐 MathJax' : '';

        setTranscriptStatus(
          `✅ Transcription ${qualityBadge}${mathBadge} ajoutée (${transcriptData.totalSegments} segments • ${Math.round(transcriptData.totalDuration / 60)} min)`
        );
      } else {
        setTranscriptStatus('⚠️ Vidéo ajoutée, mais aucune transcription disponible');
      }

      setTimeout(() => {
        resetForm();
        onVideoAdded(courseId);
      }, 3000);
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      setTranscriptStatus('❌ Erreur lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setUrl('');
    setCourseId('');
    setOrder('');
    setTranscriptStatus('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mb-8 p-6 bg-white rounded-xl shadow-lg">
      <h3 className="text-2xl font-bold text-gray-800">Ajouter une nouvelle vidéo</h3>

      <input
        type="text"
        placeholder="Titre de la vidéo"
        className="border w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <input
        type="url"
        placeholder="Lien YouTube (ex: https://youtu.be/kWEFtcWl_xU)"
        className="border w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
      />

      <select
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
        className="border w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      >
        <option value="">-- Choisir un cours --</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title}
          </option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Ordre dans le cours"
        className="border w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={order}
        readOnly
      />

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3 rounded-lg font-semibold text-white transition ${loading
          ? 'bg-gray-500 cursor-not-allowed'
          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
          }`}
      >
        {loading ? transcriptStatus || 'Traitement en cours...' : 'Ajouter la vidéo + Transcription MathJax'}
      </button>

      {transcriptStatus && !loading && (
        <div
          className={`p-4 rounded-lg text-sm font-medium ${transcriptStatus.includes('✅')
            ? 'bg-green-100 text-green-800 border border-green-300'
            : transcriptStatus.includes('⚠️')
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              : transcriptStatus.includes('❌')
                ? 'bg-red-100 text-red-800 border border-red-300'
                : 'bg-blue-100 text-blue-800'
            }`}
        >
          {transcriptStatus}
        </div>
      )}
    </form>
  );
}
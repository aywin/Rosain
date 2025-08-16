'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

interface Video {
  id: string;
  title: string;
  url: string;
  duration?: number; // Durée en secondes, optionnel
}

interface Quiz {
  id: string;
  timestamp: number;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function TutoTestPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const playerRef = useRef<any>(null);

  // Charger la liste de vidéos Firestore
  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vids = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Video, 'id'>),
      }));
      setVideos(vids);
      setLoading(false);
      if (vids.length > 0 && !selectedVideo) {
        setSelectedVideo(vids[0]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Récupérer les quiz pour la vidéo sélectionnée
  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!selectedVideo) return;
      const q = query(collection(db, 'quizzes'), where('videoId', '==', selectedVideo.id));
      const snapshot = await getDocs(q);
      const quizData = snapshot.docs.map((doc) => ({
        id: doc.id,
        timestamp: doc.data().timestamp as number,
      }));
      setQuizzes(quizData);
    };
    fetchQuizzes();
  }, [selectedVideo]);

  const getYouTubeId = (url: string) => {
    const regExp = /(?:youtube\.com.*(?:\?|&)v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  // Charger l'API YouTube
  useEffect(() => {
    if (window.YT) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
  }, []);

  // Initialiser le lecteur quand la vidéo change
  useEffect(() => {
    if (!selectedVideo) return;

    const videoId = getYouTubeId(selectedVideo.url);
    if (!videoId) return;

    // Utiliser la durée de Firestore comme secours initial
    if (selectedVideo.duration) {
      setDuration(selectedVideo.duration);
    }

    window.onYouTubeIframeAPIReady = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      playerRef.current = new window.YT.Player('yt-player', {
        videoId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
        },
        events: {
          onReady: (event: any) => {
            // Prioriser la durée de l'API YouTube pour plus de précision
            const apiDuration = event.target.getDuration();
            setDuration(apiDuration || selectedVideo.duration || 0);
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              const interval = setInterval(() => {
                if (playerRef.current && playerRef.current.getCurrentTime) {
                  const currentTime = playerRef.current.getCurrentTime();
                  setProgress(currentTime);

                  // Vérifier si un quiz doit être déclenché
                  const quizToTrigger = quizzes.find(
                    (quiz) => Math.abs(quiz.timestamp - currentTime) < 0.5
                  );
                  if (quizToTrigger) {
                    playerRef.current.pauseVideo();
                    setIsPlaying(false);
                    alert(`Quiz à ${formatTime(quizToTrigger.timestamp)} !`);
                    // TODO: Afficher le quiz ici
                  }
                }
              }, 100);
              return () => clearInterval(interval);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      window.onYouTubeIframeAPIReady();
    }
  }, [selectedVideo, quizzes]);

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value: string) => {
    const seconds = parseFloat(value);
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
      setProgress(seconds);
    }
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <p>Chargement des vidéos...</p>;

  return (
    <div className="flex h-screen">
      <aside className="w-1/4 border-r overflow-y-auto p-4">
        <h2 className="text-xl font-bold mb-4">Vidéos</h2>
        {videos.length === 0 && <p>Aucune vidéo disponible</p>}
        <ul>
          {videos.map((video) => (
            <li
              key={video.id}
              className={`cursor-pointer mb-2 p-2 rounded ${
                selectedVideo?.id === video.id
                  ? 'bg-blue-200 font-semibold'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => setSelectedVideo(video)}
            >
              {video.title}
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {selectedVideo ? (
          <>
            <h3 className="text-2xl font-bold mb-4">{selectedVideo.title}</h3>
            <div id="yt-player" className="w-full max-w-4xl aspect-video"></div>
            <div className="relative flex items-center gap-2 mt-4 w-full max-w-4xl">
              <span>{formatTime(progress)}</span>
              <div className="relative flex-1">
                <input
                  type="range"
                  min={0}
                  max={duration}
                  value={progress}
                  step="1"
                  onChange={(e) => handleSeek(e.target.value)}
                  className="w-full"
                />
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="absolute top-1/2 transform -translate-y-1/2 w-1 h-4 bg-red-500 cursor-pointer"
                    style={{
                      left: `${(quiz.timestamp / duration) * 100}%`,
                    }}
                    title={`Quiz at ${formatTime(quiz.timestamp)}`}
                    onClick={() => handleSeek(quiz.timestamp.toString())}
                  />
                ))}
              </div>
              <span>{formatTime(duration)}</span>
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={togglePlayPause}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                {isPlaying ? 'Pause' : 'Lecture'}
              </button>
              <button
                onClick={() => handleSeek((progress - 5).toString())}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                ⏪ -5 sec
              </button>
              <button
                onClick={() => handleSeek((progress + 5).toString())}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                ⏩ +5 sec
              </button>
            </div>
          </>
        ) : (
          <p>Sélectionnez une vidéo à lire</p>
        )}
      </main>
    </div>
  );
}
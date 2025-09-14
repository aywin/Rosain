"use client";

import { useEffect, useRef, useState } from "react";
import YouTube, { YouTubePlayer } from "react-youtube";
import { db } from "@/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

// Types
interface Video {
  id: string;     // Firestore doc id
  title: string;
  url: string;
}

interface Answer {
  text: string;
  correct: boolean;
}

interface Question {
  text: string;
  answers: Answer[];
}

interface Quiz {
  id: string;
  videoId: string;
  timestamp: number;
  questions: Question[];
}

export default function TestVideoPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [answeredQuizzes, setAnsweredQuizzes] = useState<string[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const playerRef = useRef<YouTubePlayer | null>(null);

  // Charger toutes les vidéos
  useEffect(() => {
    const fetchVideos = async () => {
      const snapshot = await getDocs(collection(db, "videos"));
      setVideos(
        snapshot.docs.map((doc) => ({
          id: doc.id, // Firestore doc.id
          title: doc.data().title,
          url: doc.data().url,
        })) as Video[]
      );
    };
    fetchVideos();
  }, []);

  // Charger les quiz pour la vidéo sélectionnée
  useEffect(() => {
    if (!selectedVideo) return;
    const fetchQuizzes = async () => {
      const q = query(collection(db, "quizzes"), where("videoId", "==", selectedVideo.id));
      const snapshot = await getDocs(q);
      setQuizzes(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Quiz[]
      );
      setAnsweredQuizzes([]);
    };
    fetchQuizzes();
  }, [selectedVideo]);

  // Vérifier la progression pour déclencher quiz
  useEffect(() => {
    const interval = setInterval(() => {
      if (!playerRef.current || currentQuiz || !selectedVideo) return;
      const time = playerRef.current.getCurrentTime();
      const nextQuiz = quizzes.find(
        (q) => q.timestamp <= time && !answeredQuizzes.includes(q.id)
      );
      if (nextQuiz) {
        setCurrentQuiz(nextQuiz);
        playerRef.current.pauseVideo();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [quizzes, currentQuiz, answeredQuizzes, selectedVideo]);

  const handleAnswerChange = (qIndex: number, aIndex: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIndex]: aIndex }));
  };

  const handleQuizSubmit = () => {
    if (!currentQuiz) return;
    alert("Quiz validé !");
    setAnsweredQuizzes((prev) => [...prev, currentQuiz.id]);
    setSelectedAnswers({});
    setCurrentQuiz(null);
    playerRef.current?.playVideo();
  };

  // 🔑 Extraction de l'ID YouTube directement depuis l'URL Firestore
  const getYouTubeId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  return (
    <div className="flex flex-col md:flex-row p-4 gap-4">
      {/* Sidebar vidéos */}
      <div className="md:w-1/4 bg-gray-100 p-2 rounded max-h-screen overflow-y-auto">
        <h2 className="font-bold mb-2">Vidéos</h2>
        {videos.map((video) => (
          <button
            key={video.id}
            className={`block w-full text-left p-2 rounded mb-1 ${
              selectedVideo?.id === video.id ? "bg-blue-500 text-white" : "bg-white"
            }`}
            onClick={() => setSelectedVideo(video)}
          >
            {video.title}
          </button>
        ))}
      </div>

      {/* Player + quiz */}
      <div className="md:w-3/4 relative">
        {selectedVideo ? (
          <>
            <YouTube
              videoId={getYouTubeId(selectedVideo.url) || ""}
              opts={{
                width: "100%",
                height: "480",
                playerVars: {
                  autoplay: 0,
                  modestbranding: 1,
                  rel: 0,
                  controls: 1,
                },
              }}
              onReady={(event) => (playerRef.current = event.target)}
            />

            {/* Overlay quiz */}
            {currentQuiz && (
              <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center p-4 text-white z-50">
                <h3 className="text-xl font-bold mb-4">Quiz !</h3>
                {currentQuiz.questions.map((q, qIndex) => (
                  <div key={qIndex} className="mb-3 w-full">
                    <p className="mb-2">{q.text}</p>
                    {q.answers.map((a, aIndex) => (
                      <label key={aIndex} className="block mb-1">
                        <input
                          type="radio"
                          name={`q-${qIndex}`}
                          checked={selectedAnswers[qIndex] === aIndex}
                          onChange={() => handleAnswerChange(qIndex, aIndex)}
                          className="mr-2"
                        />
                        {a.text}
                      </label>
                    ))}
                  </div>
                ))}
                <button
                  className="mt-2 bg-green-500 px-4 py-2 rounded"
                  onClick={handleQuizSubmit}
                >
                  Valider
                </button>
              </div>
            )}
          </>
        ) : (
          <p>Sélectionnez une vidéo pour commencer.</p>
        )}
      </div>
    </div>
  );
}

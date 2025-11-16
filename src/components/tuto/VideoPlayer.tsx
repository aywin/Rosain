"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import VideoControls from "./VideoControls";
import ProgressBar from "./ProgressBar";
import QuizOverlay, { Quiz } from "./QuizOverlay";
import { logQuizResponse, logVideoProgress } from "@/helpers/activityTracker";
import { auth } from "@/firebase";
import VideoTranscript from "./VideoTranscript";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Interface pour la transcription
interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

// ✅ CORRECTION : Ajout de onTimeUpdate dans l'interface
interface VideoPlayerProps {
  url: string;
  title: string;
  courseId: string;
  videoIdFirestore: string;
  onAssistantClick: () => void;
  onNext: () => void;
  quizzes?: Quiz[];
  transcript?: TranscriptSegment[];
  onTimeUpdate?: (time: number) => void; // ✅ NOUVEAU
}

// ✅ CORRECTION : Destructurer onTimeUpdate dans les props
export default function VideoPlayer({
  url,
  title,
  courseId,
  videoIdFirestore,
  onAssistantClick,
  onNext,
  quizzes = [],
  transcript = [],
  onTimeUpdate, // ✅ NOUVEAU
}: VideoPlayerProps) {

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const rafRef = useRef<number | null>(null);
  const onNextRef = useRef(onNext);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [answeredQuizzes, setAnsweredQuizzes] = useState<string[]>([]);
  const [displayedQuizzes, setDisplayedQuizzes] = useState<string[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [savedQuizAnswers, setSavedQuizAnswers] = useState<Record<string, Record<number, number>>>({});
  const [countdown, setCountdown] = useState<number | null>(null);

  const displayedRef = useRef<string[]>([]);
  const savedAnswersRef = useRef<Record<string, Record<number, number>>>({});

  useEffect(() => { onNextRef.current = onNext; }, [onNext]);
  useEffect(() => { displayedRef.current = displayedQuizzes; }, [displayedQuizzes]);
  useEffect(() => { savedAnswersRef.current = savedQuizAnswers; }, [savedQuizAnswers]);

  const getVideoId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };
  const videoId = getVideoId(url);

  // Reset état à chaque vidéo
  useEffect(() => {
    setAnsweredQuizzes([]);
    setDisplayedQuizzes([]);
    setSelectedAnswers({});
    setSavedQuizAnswers({});
    setCurrentQuiz(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setCountdown(null);
  }, [videoId]);

  // Init YouTube Player
  useEffect(() => {
    if (!videoId || !containerRef.current) {
      setError("URL de la vidéo invalide.");
      setIsPlayerReady(false);
      return;
    }

    const onPlayerReady = (event: any) => {
      playerRef.current = event.target;
      setDuration(playerRef.current.getDuration());
      setIsPlayerReady(true);
      setError(null);
    };

    const onPlayerStateChange = (event: any) => {
      const state = event.data;
      if (state === window.YT.PlayerState.PLAYING) {
        setIsPlaying(true);
        startProgressLoop();
      } else {
        setIsPlaying(false);
        stopProgressLoop();
      }

      if (state === window.YT.PlayerState.ENDED) {
        stopProgressLoop();
        startCountdown(3);
      }
    };

    const initPlayer = () => {
      if (!playerRef.current) {
        new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange },
        });
      } else {
        playerRef.current.loadVideoById(videoId);
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(false);
      }
    };

    if (window.YT && window.YT.Player) initPlayer();
    else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.getElementsByTagName("script")[0].parentNode?.insertBefore(tag, document.getElementsByTagName("script")[0]);
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      stopProgressLoop();
      if (playerRef.current?.destroy) playerRef.current.destroy();
      playerRef.current = null;
      setIsPlayerReady(false);
      window.onYouTubeIframeAPIReady = () => { };
    };
  }, [videoId]);

  // ✅ CORRECTION : Ajout de l'appel onTimeUpdate dans la boucle
  useEffect(() => {
    if (!duration) return;

    let lastLogged = 0;

    const loop = () => {
      if (playerRef.current?.getCurrentTime) {
        const t = playerRef.current.getCurrentTime();
        setCurrentTime(t);

        // ✅ NOUVEAU : Transmettre le temps au parent (TutoPage)
        if (onTimeUpdate) {
          onTimeUpdate(t);
        }

        checkQuiz(t);

        // Log Firestore uniquement si un utilisateur est connecté
        const user = auth.currentUser;
        if (user && videoIdFirestore) {
          if (t - lastLogged >= 5 || t === duration) {
            lastLogged = t;
            const minutesWatched = t / 60;
            const minutesRemaining = duration / 60 - minutesWatched;
            const completed = t >= duration - 1;

            logVideoProgress({
              userId: user.uid,
              videoId: videoIdFirestore,
              courseId,
              minutesWatched,
              minutesRemaining,
              lastPosition: t,
              completed,
              updatedAt: new Date(),
            });
          }
        }
      }

      // Toujours continuer la boucle, même sans user
      if (isPlaying) rafRef.current = requestAnimationFrame(loop);
    };

    if (isPlaying) rafRef.current = requestAnimationFrame(loop);

    return () => stopProgressLoop();
  }, [
    isPlaying,
    duration,
    videoIdFirestore ?? null,
    courseId ?? null,
    onTimeUpdate, // ✅ AJOUT dans les dépendances
  ]);

  const startProgressLoop = () => {
    stopProgressLoop();
    if (isPlaying) rafRef.current = requestAnimationFrame(() => { });
  };

  const stopProgressLoop = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  // Gestion quizzes
  const sortedQuizzes = useMemo(() => [...quizzes].sort((a, b) => a.timestamp - b.timestamp), [quizzes]);

  const checkQuiz = (current: number) => {
    const nextQuiz = sortedQuizzes.find(q => Math.abs(current - q.timestamp) < 0.5 && !displayedRef.current.includes(q.id));
    if (nextQuiz) {
      setCurrentQuiz(nextQuiz);
      setDisplayedQuizzes(prev => [...prev, nextQuiz.id]);
      setSelectedAnswers(savedAnswersRef.current[nextQuiz.id] || {});
      playerRef.current.pauseVideo();
      stopProgressLoop();
    }
  };

  const handleAnswerChange = (qIndex: number, aIndex: number) => {
    setSelectedAnswers(prev => {
      const copy = { ...prev };
      if (aIndex === -1) delete copy[qIndex];
      else copy[qIndex] = aIndex;
      return copy;
    });
  };

  const handleQuizSubmit = (timestamp: number) => {
    if (!currentQuiz) return;
    const user = auth.currentUser;

    const correctAnswers: Record<number, number> = {};
    currentQuiz.questions.forEach((q, i) => {
      correctAnswers[i] = q.answers.findIndex(a => a.correct);
    });

    const userAnswers = { ...selectedAnswers };
    const total = currentQuiz.questions.length;
    const correctCount = currentQuiz.questions.filter(
      (q, i) => userAnswers[i] === correctAnswers[i]
    ).length;
    const score = Math.round((correctCount / total) * 100);

    // Enregistrer seulement si un user est connecté
    if (user && videoIdFirestore) {
      logQuizResponse({
        quizId: currentQuiz.id,
        userId: user.uid,
        videoId: videoIdFirestore,
        courseId,
        userAnswers,
        correctAnswers,
        isCorrect: score,
        submittedAt: new Date(),
      });
    }

    // Toujours enregistrer localement (même pour invités)
    setSavedQuizAnswers(prev => ({ ...prev, [currentQuiz.id]: selectedAnswers }));
    setAnsweredQuizzes(prev => [...prev, currentQuiz.id]);
    setSelectedAnswers({});
    setCurrentQuiz(null);

    // Reprendre la lecture pour tout le monde
    if (playerRef.current) {
      const newTime = Math.min(timestamp, duration);
      playerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
      playerRef.current.playVideo();
      startProgressLoop();
    }
  };

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    const state = playerRef.current.getPlayerState();
    state === window.YT.PlayerState.PLAYING ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
    state === window.YT.PlayerState.PLAYING ? stopProgressLoop() : startProgressLoop();
  };

  const handleSeek = (newTime: number) => {
    if (!playerRef.current?.seekTo) return;
    newTime = Math.max(0, Math.min(newTime, duration));

    // Vérifie si un quiz est entre l'ancien temps et le nouveau
    const nextQuiz = sortedQuizzes.find(q => currentTime < q.timestamp && q.timestamp <= newTime && !answeredQuizzes.includes(q.id));
    if (nextQuiz) {
      setCurrentQuiz(nextQuiz);
      setDisplayedQuizzes(prev => [...prev, nextQuiz.id]);
      setSelectedAnswers(savedAnswersRef.current[nextQuiz.id] || {});
      playerRef.current.pauseVideo();
      stopProgressLoop();
      playerRef.current.seekTo(nextQuiz.timestamp, true);
      setCurrentTime(nextQuiz.timestamp);
      return;
    }

    setDisplayedQuizzes(prev => prev.filter(id => {
      const quiz = sortedQuizzes.find(q => q.id === id);
      return quiz && newTime < quiz.timestamp;
    }));

    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const startCountdown = (seconds: number) => {
    let timeLeft = seconds;
    setCountdown(timeLeft);
    const interval = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft > 0) setCountdown(timeLeft);
      else {
        clearInterval(interval);
        setCountdown(null);
        onNextRef.current?.();
      }
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center relative w-full max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      {error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <div className="relative w-[70%] aspect-video rounded-lg overflow-hidden shadow-lg">
            <div ref={containerRef} className="w-full h-full pointer-events-none" />
            <div className="absolute inset-0 z-10 cursor-pointer" onClick={handlePlayPause} />
          </div>

          <ProgressBar currentTime={currentTime} duration={duration} onSeek={handleSeek} />
          <VideoControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayPause={handlePlayPause}
            onSeekForward={() => handleSeek(currentTime + 10)}
            onSeekBackward={() => handleSeek(currentTime - 10)}
            onNext={() => onNextRef.current?.()}
          />

          {countdown !== null && (
            <div className="mt-4 flex items-center justify-between bg-gray-100 p-3 rounded shadow">
              <p className="text-gray-700">
                Prochain chapitre dans <span className="font-bold">{countdown}</span> sec...
              </p>
              <button
                onClick={() => { setCountdown(null); onNextRef.current?.(); }}
                className="ml-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Passer maintenant →
              </button>
            </div>
          )}

          <button
            onClick={onAssistantClick}
            className="mt-4 self-end px-3 py-2 border rounded hover:bg-blue-600 hover:text-white transition"
          >
            Ouvrir Assistant IA →
          </button>

          {/* Affichage de la transcription */}
          <VideoTranscript
            transcript={transcript}
            currentTime={currentTime}
            onSeek={handleSeek}
          />

          {currentQuiz && (
            <QuizOverlay
              quiz={currentQuiz}
              selectedAnswers={selectedAnswers}
              onAnswerChange={handleAnswerChange}
              onSubmit={handleQuizSubmit}
            />
          )}
        </>
      )}
    </div>
  );
}
// front/src/components/tuto/VideoPlayer.tsx
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { FaRobot, FaClock } from "react-icons/fa";
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

interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

interface VideoPlayerProps {
  url: string;
  title: string;
  courseId: string;
  videoIdFirestore: string;
  onAssistantClick: () => void;
  onNext: () => void;
  quizzes?: Quiz[];
  transcript?: TranscriptSegment[];
  language?: string;
  isGenerated?: boolean;
  isMathJaxFormatted?: boolean;
  onTimeUpdate?: (time: number) => void;
}

export default function VideoPlayer({
  url,
  title,
  courseId,
  videoIdFirestore,
  onAssistantClick,
  onNext,
  quizzes = [],
  transcript = [],
  language,
  isGenerated,
  isMathJaxFormatted,
  onTimeUpdate,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const onNextRef = useRef(onNext);
  const lastTimeUpdateRef = useRef<number>(0);

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

  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);
  useEffect(() => {
    displayedRef.current = displayedQuizzes;
  }, [displayedQuizzes]);
  useEffect(() => {
    savedAnswersRef.current = savedQuizAnswers;
  }, [savedQuizAnswers]);

  const getVideoId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };
  const videoId = getVideoId(url);

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
    lastTimeUpdateRef.current = 0;
  }, [videoId]);

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
      document.getElementsByTagName("script")[0].parentNode?.insertBefore(
        tag,
        document.getElementsByTagName("script")[0]
      );
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

  useEffect(() => {
    if (!duration) return;

    let lastLogged = 0;

    const loop = () => {
      if (playerRef.current?.getCurrentTime) {
        const rawTime = playerRef.current.getCurrentTime();
        const t = Math.round(rawTime * 100) / 100;

        setCurrentTime(t);

        if (onTimeUpdate && t - lastTimeUpdateRef.current >= 0.5) {
          lastTimeUpdateRef.current = t;
          onTimeUpdate(t);
        }

        checkQuiz(t);

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

      if (isPlaying) rafRef.current = requestAnimationFrame(loop);
    };

    if (isPlaying) rafRef.current = requestAnimationFrame(loop);

    return () => stopProgressLoop();
  }, [isPlaying, duration, videoIdFirestore, courseId, onTimeUpdate]);

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

  const sortedQuizzes = useMemo(
    () => [...quizzes].sort((a, b) => a.timestamp - b.timestamp),
    [quizzes]
  );

  const checkQuiz = (current: number) => {
    const nextQuiz = sortedQuizzes.find(
      (q) => Math.abs(current - q.timestamp) < 0.5 && !displayedRef.current.includes(q.id)
    );
    if (nextQuiz) {
      setCurrentQuiz(nextQuiz);
      setDisplayedQuizzes((prev) => [...prev, nextQuiz.id]);
      setSelectedAnswers(savedAnswersRef.current[nextQuiz.id] || {});
      playerRef.current.pauseVideo();
      stopProgressLoop();
    }
  };

  const handleAnswerChange = (qIndex: number, aIndex: number) => {
    setSelectedAnswers((prev) => {
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
      correctAnswers[i] = q.answers.findIndex((a) => a.correct);
    });

    const userAnswers = { ...selectedAnswers };
    const total = currentQuiz.questions.length;
    const correctCount = currentQuiz.questions.filter(
      (q, i) => userAnswers[i] === correctAnswers[i]
    ).length;
    const score = Math.round((correctCount / total) * 100);

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

    setSavedQuizAnswers((prev) => ({ ...prev, [currentQuiz.id]: selectedAnswers }));
    setAnsweredQuizzes((prev) => [...prev, currentQuiz.id]);
    setSelectedAnswers({});
    setCurrentQuiz(null);

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
    state === window.YT.PlayerState.PLAYING
      ? playerRef.current.pauseVideo()
      : playerRef.current.playVideo();
    state === window.YT.PlayerState.PLAYING ? stopProgressLoop() : startProgressLoop();
  };

  const handleSeek = (newTime: number) => {
    if (!playerRef.current?.seekTo) return;
    newTime = Math.max(0, Math.min(newTime, duration));

    const nextQuiz = sortedQuizzes.find(
      (q) =>
        currentTime < q.timestamp &&
        q.timestamp <= newTime &&
        !answeredQuizzes.includes(q.id)
    );
    if (nextQuiz) {
      setCurrentQuiz(nextQuiz);
      setDisplayedQuizzes((prev) => [...prev, nextQuiz.id]);
      setSelectedAnswers(savedAnswersRef.current[nextQuiz.id] || {});
      playerRef.current.pauseVideo();
      stopProgressLoop();
      playerRef.current.seekTo(nextQuiz.timestamp, true);
      setCurrentTime(nextQuiz.timestamp);
      return;
    }

    setDisplayedQuizzes((prev) =>
      prev.filter((id) => {
        const quiz = sortedQuizzes.find((q) => q.id === id);
        return quiz && newTime < quiz.timestamp;
      })
    );

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
    <div className="flex flex-col items-center relative w-full max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">{title}</h2>

      {error ? (
        <p className="text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200">{error}</p>
      ) : (
        <>
          <div className="relative w-[70%] aspect-video rounded-xl overflow-hidden shadow-2xl">
            <div ref={containerRef} className="w-full h-full pointer-events-none" />
            <div
              className="absolute inset-0 z-10 cursor-pointer"
              onClick={handlePlayPause}
            />
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
            <div className="mt-6 flex items-center justify-between bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg shadow-md border border-blue-200 w-[70%]">
              <div className="flex items-center gap-3">
                <FaClock className="text-blue-600 text-xl animate-pulse" />
                <p className="text-gray-800 font-medium">
                  Prochain chapitre dans <span className="font-bold text-blue-600">{countdown}</span> sec...
                </p>
              </div>
              <button
                onClick={() => {
                  setCountdown(null);
                  onNextRef.current?.();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-sm"
              >
                Passer maintenant →
              </button>
            </div>
          )}

          <button
            onClick={onAssistantClick}
            className="mt-6 self-end flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition font-semibold shadow-md"
          >
            <FaRobot className="text-lg" />
            <span>Ouvrir Assistant IA</span>
          </button>

          <VideoTranscript
            transcript={transcript}
            currentTime={currentTime}
            onSeek={handleSeek}
            language={language}
            isGenerated={isGenerated}
            isMathJaxFormatted={isMathJaxFormatted}
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
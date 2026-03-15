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
  onVideoEnded?: () => void;
  /** Appelé une seule fois quand 90% de la vidéo est atteint */
  onNinetyPercent?: () => void;
  quizzes?: Quiz[];
  transcript?: TranscriptSegment[];
  language?: string;
  isGenerated?: boolean;
  isMathJaxFormatted?: boolean;
  onTimeUpdate?: (time: number) => void;
  initialPosition?: number;
  subject?: string;
}

export default function VideoPlayer({
  url,
  title,
  courseId,
  videoIdFirestore,
  onAssistantClick,
  onNext,
  onVideoEnded,
  onNinetyPercent,
  quizzes = [],
  transcript = [],
  language,
  isGenerated,
  isMathJaxFormatted,
  onTimeUpdate,
  initialPosition = 0,
  subject = "Math",
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const onNextRef = useRef(onNext);
  const onVideoEndedRef = useRef(onVideoEnded);
  const maxPositionRef = useRef<number>(initialPosition);
  const ninetyPercentFiredRef = useRef<boolean>(false);
  const lastLoggedRef = useRef<number>(0);

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
  useEffect(() => { onVideoEndedRef.current = onVideoEnded; }, [onVideoEnded]);
  useEffect(() => { displayedRef.current = displayedQuizzes; }, [displayedQuizzes]);
  useEffect(() => { savedAnswersRef.current = savedQuizAnswers; }, [savedQuizAnswers]);

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
    maxPositionRef.current = initialPosition;
    lastLoggedRef.current = 0;
    ninetyPercentFiredRef.current = false;
  }, [videoId, initialPosition]);

  useEffect(() => {
    if (!videoId || !containerRef.current) {
      setError("URL de la vidéo invalide.");
      setIsPlayerReady(false);
      return;
    }

    const onPlayerReady = (event: any) => {
      playerRef.current = event.target;
      const dur = playerRef.current.getDuration();
      setDuration(dur);
      setIsPlayerReady(true);
      setError(null);

      if (initialPosition > 0 && initialPosition < dur - 5) {
        playerRef.current.seekTo(initialPosition, true);
        setCurrentTime(initialPosition);
      }
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
        onVideoEndedRef.current?.();
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

    const loop = () => {
      if (playerRef.current?.getCurrentTime) {
        const t = Math.round(playerRef.current.getCurrentTime() * 100) / 100;

        setCurrentTime(t);

        if (onTimeUpdate && Math.abs(t - lastLoggedRef.current) >= 0.5) {
          onTimeUpdate(t);
        }

        checkQuiz(t);

        const user = auth.currentUser;
        if (user && videoIdFirestore) {
          if (t - lastLoggedRef.current >= 15 || t >= duration - 1) {
            if (t > maxPositionRef.current) {
              maxPositionRef.current = t;

              // ⚡ Déclencher onNinetyPercent une seule fois
              if (
                !ninetyPercentFiredRef.current &&
                duration > 0 &&
                t >= duration * 0.9
              ) {
                ninetyPercentFiredRef.current = true;
                onNinetyPercent?.();
              }
              lastLoggedRef.current = t;
              logVideoProgress({
                userId: user.uid,
                videoId: videoIdFirestore,
                courseId,
                minutesWatched: t / 60,
                minutesRemaining: duration / 60 - t / 60,
                lastPosition: t,
                completed: t >= duration - 1,
                updatedAt: new Date(),
              });
            } else {
              lastLoggedRef.current = t;
            }
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
    <div className="flex flex-col items-center relative w-full max-w-5xl mx-auto px-2 md:px-0">
      {/* Titre */}
      <h2 className="text-lg md:text-2xl font-bold mb-4 md:mb-6 text-gray-800 text-center w-full">
        {title}
      </h2>

      {error ? (
        <p className="text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200">
          {error}
        </p>
      ) : (
        <>
          {/* ── Vidéo : plein écran sur mobile, 70% sur desktop ── */}
          <div className="relative w-full md:w-[70%] aspect-video rounded-xl overflow-hidden shadow-2xl">
            <div ref={containerRef} className="w-full h-full pointer-events-none" />
            <div
              className="absolute inset-0 z-10 cursor-pointer"
              onClick={handlePlayPause}
            />
          </div>

          {/* ── Progress bar : même largeur que la vidéo ── */}
          <div className="w-full md:w-[70%]">
            <ProgressBar currentTime={currentTime} duration={duration} onSeek={handleSeek} />
          </div>

          {/* ── Contrôles ── */}
          <VideoControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayPause={handlePlayPause}
            onSeekForward={() => handleSeek(currentTime + 10)}
            onSeekBackward={() => handleSeek(currentTime - 10)}
            onNext={() => onNextRef.current?.()}
          />

          {/* ── Countdown chapitre suivant ── */}
          {countdown !== null && (
            <div className="mt-4 md:mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-blue-50 to-green-50 p-3 md:p-4 rounded-lg shadow-md border border-blue-200 w-full md:w-[70%] gap-3 sm:gap-0">
              <div className="flex items-center gap-3">
                <FaClock className="text-blue-600 text-xl animate-pulse flex-shrink-0" />
                <p className="text-gray-800 font-medium text-sm md:text-base">
                  Prochain chapitre dans{" "}
                  <span className="font-bold text-blue-600">{countdown}</span> sec...
                </p>
              </div>
              <button
                onClick={() => {
                  setCountdown(null);
                  onNextRef.current?.();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-sm text-sm w-full sm:w-auto"
              >
                Passer maintenant →
              </button>
            </div>
          )}

          {/* ── Bouton assistant ── */}
          <button
            onClick={onAssistantClick}
            className="mt-4 md:mt-6 self-end flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition font-semibold shadow-md text-sm md:text-base"
          >
            <FaRobot className="text-base md:text-lg" />
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
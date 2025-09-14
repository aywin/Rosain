"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import QuizOverlay, { Quiz } from "./QuizOverlay";

interface QuizManagerProps {
  quizzes: Quiz[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isPlayerReady: boolean;
  playerRef: React.MutableRefObject<any>;
  stopProgressUpdate: () => void;
  startProgressUpdate: () => void;
}

export default function QuizManager({
  quizzes,
  currentTime,
  duration,
  isPlaying,
  isPlayerReady,
  playerRef,
  stopProgressUpdate,
  startProgressUpdate,
}: QuizManagerProps) {
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [answeredQuizzes, setAnsweredQuizzes] = useState<string[]>([]);
  const [displayedQuizzes, setDisplayedQuizzes] = useState<string[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [savedQuizAnswers, setSavedQuizAnswers] = useState<Record<string, Record<number, number>>>({});

  const displayedRef = useRef<string[]>([]);
  const savedAnswersRef = useRef<Record<string, Record<number, number>>>({});

  useEffect(() => {
    displayedRef.current = displayedQuizzes;
  }, [displayedQuizzes]);

  useEffect(() => {
    savedAnswersRef.current = savedQuizAnswers;
  }, [savedQuizAnswers]);

  // tri des quiz
  const sortedQuizzes = useMemo(() => [...quizzes].sort((a, b) => a.timestamp - b.timestamp), [quizzes]);

  // détection quiz
  useEffect(() => {
    if (!sortedQuizzes || currentQuiz || !isPlayerReady || !isPlaying) return;

    const interval = setInterval(() => {
      const current = playerRef.current?.getCurrentTime();
      if (current != null) {
        const nextQuiz = sortedQuizzes.find(
          q => Math.abs(current - q.timestamp) < 0.5 && !displayedRef.current.includes(q.id)
        );
        if (nextQuiz) {
          setCurrentQuiz(nextQuiz);
          setDisplayedQuizzes(prev => [...prev, nextQuiz.id]);
          setSelectedAnswers(savedAnswersRef.current[nextQuiz.id] || {});
          playerRef.current.pauseVideo();
          stopProgressUpdate();
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [sortedQuizzes, currentQuiz?.id, isPlayerReady, isPlaying, playerRef, stopProgressUpdate]);

  const handleAnswerChange = (qIndex: number, aIndex: number) => {
    setSelectedAnswers(prev => {
      if (aIndex === -1) {
        const copy = { ...prev };
        delete copy[qIndex];
        return copy;
      }
      return { ...prev, [qIndex]: aIndex };
    });
  };

  const handleQuizSubmit = (timestamp: number) => {
    if (!currentQuiz) return;

    setSavedQuizAnswers(prev => ({
      ...prev,
      [currentQuiz.id]: selectedAnswers,
    }));
    setAnsweredQuizzes(prev => [...prev, currentQuiz.id]);
    setSelectedAnswers({});
    setCurrentQuiz(null);

    if (playerRef.current) {
      const newTime = Math.min(timestamp, duration);
      playerRef.current.seekTo(newTime, true);
      playerRef.current.playVideo();
      startProgressUpdate();
    }
  };

  return currentQuiz ? (
    <QuizOverlay
      quiz={currentQuiz}
      selectedAnswers={selectedAnswers}
      onAnswerChange={handleAnswerChange}
      onSubmit={handleQuizSubmit}
    />
  ) : null;
}

// src/utils/progress.ts
import { Timestamp } from "firebase/firestore";

/**
 * Types partagés (structure minimale nécessaire)
 */
export interface QuizResponse {
  id: string;
  quizId: string;
  userId?: string;
  videoId?: string;
  courseId?: string;
  userAnswers?: Record<string, any>;
  correctAnswers?: Record<string, any>;
  isCorrect?: number; // % ou nombre
  submittedAt?: Timestamp | null;
}

export interface VideoProgress {
  id: string;
  userId?: string;
  videoId?: string;
  courseId?: string;
  minutesWatched: number;
  minutesRemaining: number;
  lastPosition: number;
  completed: boolean;
  updatedAt?: Timestamp | null;
}

export interface CourseProgress {
  id: string;
  id_user?: string;
  id_course?: string;
  status?: "not_started" | "in_progress" | "done";
  updatedAt?: Timestamp | null;
}

export interface Enrollment {
  id: string;
  id_user?: string;
  id_course?: string;
  date_inscription?: Timestamp | null;
}

/** VIDEOS -> statistiques agrégées */
export function getVideoStats(videos: VideoProgress[]) {
  const completed = videos.filter((v) => v.completed).length;
  const started = videos.filter((v) => !v.completed && v.minutesWatched > 0).length;
  const notStarted = videos.filter((v) => v.minutesWatched === 0).length;
  const total = completed + started + notStarted;
  const percent = total > 0 ? (completed / total) * 100 : 0;
  const totalMinutesRemaining = videos.reduce(
    (sum, v) => sum + (v.minutesRemaining || 0),
    0
  );
  return {
    completed,
    started,
    notStarted,
    total,
    percent,
    totalMinutesRemaining,
  };
}

/** QUIZZES -> statistiques agrégées */
export function getQuizStats(quizzes: QuizResponse[]) {
  const totalQuizzes = quizzes.length;
  const avgScore =
    totalQuizzes > 0
      ? Math.round(
          quizzes.reduce((s, q) => s + (typeof q.isCorrect === "number" ? q.isCorrect : 0), 0) /
            totalQuizzes
        )
      : 0;

  let totalCorrectAnswers = 0;
  let totalAnswers = 0;
  quizzes.forEach((q) => {
    const userAnswers = q.userAnswers || {};
    const correctAnswers = q.correctAnswers || {};
    Object.keys(userAnswers).forEach((k) => {
      if (userAnswers[k] === correctAnswers[k]) totalCorrectAnswers++;
      totalAnswers++;
    });
  });
  const totalMissedAnswers = totalAnswers - totalCorrectAnswers;

  return {
    totalQuizzes,
    avgScore,
    totalCorrectAnswers,
    totalAnswers,
    totalMissedAnswers,
  };
}

/** Suggestions textes (extraites depuis ton code) */
export function getVideoSuggestion(percent: number) {
  if (percent < 50) return "Reprenez les vidéos non commencées pour progresser !";
  if (percent < 100) return "Terminez les vidéos en cours pour valider le cours.";
  return "Bravo, toutes les vidéos sont terminées !";
}

export function getQuizSuggestion(avgScore: number) {
  if (avgScore < 50) return "Reprenez les quizzes pour améliorer votre score.";
  if (avgScore < 80) return "Bien, mais visez plus haut pour maîtriser le cours.";
  return "Excellent score ! Vous maîtrisez les quizzes.";
}

import { Timestamp } from "firebase/firestore";

/**
 * Types alignés avec activity tracker.ts
 */
export interface QuizResponse {
  id: string; // `${userId}_${quizId}_first` ou `${userId}_${quizId}_last`
  quizId: string;
  userId: string;
  videoId: string;
  courseId: string;
  userAnswers: Record<number, number>;
  correctAnswers: Record<number, number>;
  isCorrect: number; // score %
  attemptType: "first" | "last"; // première ou dernière tentative
  submittedAt: Timestamp | null; // serverTimestamp
}

export interface VideoProgress {
  id: string; // `${userId}_${videoId}`
  userId: string;
  videoId: string;
  courseId: string;
  minutesWatched: number;
  minutesRemaining: number;
  lastPosition: number;
  completed: boolean;
  updatedAt: Timestamp | null;
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

/** Interface pour les statistiques des quizzes */
export interface AttemptStats {
  totalQuizzes: number;
  avgScore: number;
  totalCorrectAnswers: number;
  totalAnswers: number;
  totalMissedAnswers: number;
}

export interface QuizStats {
  first: AttemptStats;
  last: AttemptStats;
  improvement: {
    avgScore: number;
    totalCorrectAnswers: number;
    totalMissedAnswers: number;
  };
}

/** VIDEOS -> statistiques agrégées */
export function getVideoStats(videos: VideoProgress[]) {
  const completed = videos.filter((v) => v.completed).length;
  const started = videos.filter((v) => !v.completed && v.minutesWatched > 0).length;
  const notStarted = videos.filter((v) => !v.completed && v.minutesWatched === 0).length;

  const total = videos.length;

  const totalMinutesWatched = videos.reduce((sum, v) => sum + (v.minutesWatched || 0), 0);
  const totalMinutesRemaining = videos.reduce((sum, v) => sum + (v.minutesRemaining || 0), 0);

  const totalDuration = totalMinutesWatched + totalMinutesRemaining;

  const percent = totalDuration > 0 ? (totalMinutesWatched / totalDuration) * 100 : 0;

  const lastPosition = videos.reduce((max, v) => Math.max(max, v.lastPosition || 0), 0);

  return {
    completed,
    started,
    notStarted,
    total,
    percent,
    totalMinutesWatched,
    totalMinutesRemaining,
    lastPosition,
    status:
      completed === total && total > 0
        ? "done"
        : completed > 0 || started > 0
        ? "in_progress"
        : "not_started",
  };
}

/** QUIZZES -> statistiques agrégées par cours */
export function getQuizStats(quizzes: QuizResponse[]): Record<string, QuizStats> {
  // Grouper par cours
  const byCourse: Record<string, QuizResponse[]> = {};
  quizzes.forEach((q) => {
    if (!byCourse[q.courseId]) byCourse[q.courseId] = [];
    byCourse[q.courseId].push(q);
  });

  function computeStats(attempts: QuizResponse[]): AttemptStats {
    const totalQuizzes = attempts.length;
    const avgScore =
      totalQuizzes > 0
        ? Math.round(
            attempts.reduce(
              (s, q) => s + (typeof q.isCorrect === "number" ? q.isCorrect : 0),
              0
            ) / totalQuizzes
          )
        : 0;

    let totalCorrectAnswers = 0;
    let totalAnswers = 0;

    attempts.forEach((q) => {
      const userAnswers = q.userAnswers || {};
      const correctAnswers = q.correctAnswers || {};

      Object.keys(userAnswers).forEach((k) => {
        const key = Number(k);
        if (userAnswers[key] === correctAnswers[key]) {
          totalCorrectAnswers++;
        }
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

  const result: Record<string, QuizStats> = {};

  for (const courseId in byCourse) {
    const courseQuizzes = byCourse[courseId];

    const firstAttempts = courseQuizzes.filter((q) => q.attemptType === "first");
    const lastAttempts = courseQuizzes.filter((q) => q.attemptType === "last");

    const firstStats = computeStats(firstAttempts);
    const lastStats = computeStats(lastAttempts);

    result[courseId] = {
      first: firstStats,
      last: lastStats,
      improvement: {
        avgScore: lastStats.avgScore - firstStats.avgScore,
        totalCorrectAnswers: lastStats.totalCorrectAnswers - firstStats.totalCorrectAnswers,
        totalMissedAnswers: lastStats.totalMissedAnswers - firstStats.totalMissedAnswers,
      },
    };
  }

  return result;
}

/** Suggestions textes */
export function getVideoSuggestion(percent: number) {
  if (percent < 50) return "Reprenez les vidéos non commencées pour progresser !";
  if (percent < 100) return "Terminez les vidéos en cours pour valider le cours.";
  return "Bravo, toutes les vidéos sont terminées !";
}

export function getQuizSuggestion(firstScore: number, lastScore: number) {
  const improvement = lastScore - firstScore;
  if (lastScore < 50) {
    return improvement > 0
      ? `Votre score s'est amélioré (+${improvement} pts), mais continuez à progresser.`
      : "Reprenez les quizzes pour améliorer votre score.";
  }
  if (lastScore < 80) {
    return improvement > 0
      ? `Bien ! Vous avez progressé (+${improvement} pts). Continuez pour viser plus haut.`
      : "Bien, mais visez plus haut pour maîtriser le cours.";
  }
  return improvement > 0
    ? `Excellent score ! Vous avez gagné ${improvement} points depuis la première tentative.`
    : "Excellent score ! Vous maîtrisez les quizzes.";
}

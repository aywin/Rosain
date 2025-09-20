// components/quiz/types.ts

export interface Course {
  id: string;
  title: string;
}

export interface Video {
  id: string;
  title: string;
}

export interface Answer {
  text: string;
  correct: boolean;
}

export interface Question {
  text: string;
  answers: Answer[];
}

// Ajouter à types.ts
export interface Quiz {
  id: string;
  courseId: string;
  videoId: string;
  timestamp: number; // en secondes
  questions: Question[];
  createdAt: any; // Date ou Timestamp Firestore
}


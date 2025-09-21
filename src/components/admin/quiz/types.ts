// types.ts
export interface Course {
  id: string;
  title: string;
}

export interface Video {
  id: string;
  title: string;
  courseId: string; // <- ajouter ce champ
}

export interface Question {
  text: string;
  answers: { text: string; correct: boolean }[];
}

export interface Quiz {
  id: string;
  courseId: string;
  videoId: string;
  timestamp: number;
  questions: Question[];
  createdAt: Date;
}

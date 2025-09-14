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

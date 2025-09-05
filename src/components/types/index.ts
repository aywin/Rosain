// types/index.ts

export interface Level {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  level_id: string;
}

export interface Course {
  id: string;
  title: string;
  subject_id: string;
  level_id: string;
}

export interface ExoFormState {
  title: string;
  description: string;
  level_id: string;
  subject_id: string;
  course_id: string;
  order: number;
  difficulty: "facile" | "moyen" | "difficile";
  statement_text: string;
  statement_files: string[];
  solution_text: string;
  solution_files: string[];
  tags: string[] | string;
}

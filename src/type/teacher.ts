export interface Group {
  id: string;
  name: string;
  teacherId: string;
  studentIds: string[];
  createdAt: any;
}

export interface QuizQuestion {
  text: string;
  options: string[];       // 2–4 réponses possibles
  correctIndex: number;    // index de la bonne réponse
  requireJustification: boolean;
}

export interface QuizAnswerItem {
  questionIndex: number;
  selectedOption: number;  // -1 = non répondu
  justification: string;
  isCorrect: boolean;
}

export interface SelectedExercise {
  id: string;
  source: "exercises" | "teacherContent";
  title: string;
}

export interface Assignment {
  id: string;
  title: string;
  groupId: string;
  teacherId: string;
  type: "course" | "exercise" | "devoir";
  contentId?: string;
  contentSource?: "exercises" | "teacherContent";
  selectedExercises?: SelectedExercise[];
  fileUrl?: string;
  fileName?: string;
  instructions?: string;
  deadline?: any;
  questions?: QuizQuestion[];
  createdAt: any;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  groupId: string;
  status: "not_started" | "in_progress" | "submitted" | "corrected";
  textContent?: string;
  quizAnswers?: QuizAnswerItem[];
  grade?: number;
  feedback?: string;
  submittedAt?: any;
  correctedAt?: any;
  createdAt?: any;
}

export type AssignmentStatus = "not_started" | "in_progress" | "submitted" | "corrected";

// Contenu créé par l'enseignant (cours, devoirs, exercices)
export interface TeacherContent {
  id: string;
  teacherId: string;
  type: "cours" | "devoir" | "exercise";
  title: string;
  description: string;
  questions: QuizQuestion[];
  createdAt: any;
}

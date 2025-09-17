export interface Option {
  text: string;
  isCorrect: boolean;
}

export interface Question {
  question: string;
  options: Option[];
}

export interface AppExo {
  id: string;
  title: string;
  content?: string; // Utilisé dans AppExoPlayer pour afficher un contenu textuel
  videoAfter?: string; // Utilisé dans TutoPage et AppExoForm
  courseId?: string; // Utilisé dans AppExoForm et AppExoPlayer
  level_id?: string; // Utilisé dans AppExoForm
  subject_id?: string; // Utilisé dans AppExoForm
  questions?: Question[]; // Utilisé dans AppExoForm et AppExoPlayer
  createdAt?: any; // Timestamp Firestore
}
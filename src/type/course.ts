export interface Course {
  id: string;
  titre: string;
  description: string;
  niveau: string;
  matiere: string;
  img?: string;
  order: number; // obligatoire
}
export interface CourseWithStatus extends Course {
  enrolled: boolean;
  progressStatus: "not_started" | "in_progress" | "done";
}

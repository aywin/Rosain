// src/utils/mapCourse.tsx
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

export interface Course {
  id: string;
  titre: string;
  description: string;
  niveau: string;   // ex: "Terminale"
  matiere: string;  // ex: "Mathématiques"
}

/**
 * Transforme un document Firestore "course" en objet Course avec noms lisibles
 */
export async function mapCourseWithNames(id: string, data: any): Promise<Course> {
  let niveauNom = "Inconnu";
  let matiereNom = "Inconnu";

  try {
    const niveauSnap = await getDoc(doc(db, "levels", data.level_id));
    if (niveauSnap.exists()) {
      niveauNom = niveauSnap.data().nom;
    }

    const matiereSnap = await getDoc(doc(db, "subjects", data.subject_id));
    if (matiereSnap.exists()) {
      matiereNom = matiereSnap.data().nom;
    }
  } catch (error) {
    console.error("Erreur de mapping niveau/matière :", error);
  }

  return {
    id,
    titre: data.title,
    description: data.description,
    niveau: niveauNom,
    matiere: matiereNom,
  };
}

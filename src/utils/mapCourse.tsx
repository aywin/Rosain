// front/src/utils/mapCourse.ts
import { db } from "@/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

export interface Course {
  id: string;
  titre: string;
  description: string;
  niveau: string;
  matiere: string;
  img?: string;
}

// ⚡ Cache global pour éviter de recharger à chaque fois
let levelsCache: Map<string, string> | null = null;
let subjectsCache: Map<string, string> | null = null;

/**
 * Charge tous les levels et subjects en une seule fois
 * À appeler UNE FOIS au début du chargement des cours
 */
export async function loadLevelsAndSubjects() {
  if (levelsCache && subjectsCache) {
    return { levelsCache, subjectsCache };
  }

  const [levelsSnap, subjectsSnap] = await Promise.all([
    getDocs(collection(db, "levels")),
    getDocs(collection(db, "subjects"))
  ]);

  levelsCache = new Map();
  subjectsCache = new Map();

  levelsSnap.docs.forEach(doc => {
    levelsCache!.set(doc.id, doc.data().name);
  });

  subjectsSnap.docs.forEach(doc => {
    subjectsCache!.set(doc.id, doc.data().name);
  });

  return { levelsCache, subjectsCache };
}

/**
 * Version optimisée : utilise les caches
 */
export function mapCourseWithNamesSync(
  id: string,
  data: any,
  levelsMap: Map<string, string>,
  subjectsMap: Map<string, string>
): Course {
  return {
    id,
    titre: data.title,
    description: data.description,
    niveau: levelsMap.get(data.level_id) || "Inconnu",
    matiere: subjectsMap.get(data.subject_id) || "Inconnu",
    img: data.img || "",
  };
}

/**
 * Version legacy (garde pour compatibilité)
 * ⚠️ LENT : À éviter si possible
 */
export async function mapCourseWithNames(id: string, data: any): Promise<Course> {
  let niveauNom = "Inconnu";
  let matiereNom = "Inconnu";

  try {
    const niveauSnap = await getDoc(doc(db, "levels", data.level_id));
    if (niveauSnap.exists()) {
      niveauNom = niveauSnap.data().name;
    }

    const matiereSnap = await getDoc(doc(db, "subjects", data.subject_id));
    if (matiereSnap.exists()) {
      matiereNom = matiereSnap.data().name;
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
    img: data.img || "",
  };
}

/**
 * Version hybride : charge automatiquement si nécessaire
 */
export async function mapCourseWithNamesAuto(id: string, data: any): Promise<Course> {
  const { levelsCache, subjectsCache } = await loadLevelsAndSubjects();
  return mapCourseWithNamesSync(id, data, levelsCache, subjectsCache);
}
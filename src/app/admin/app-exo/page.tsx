"use client";

import { useEffect, useState } from "react";
import AppExoForm from "@/components/admin/app/AppExoForm";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";

interface Option {
  text: string;
  isCorrect: boolean;
}

interface Question {
  question: string;
  options: Option[];
}

interface Exercise {
  id: string;
  title: string;
  courseId: string;
  questions: Question[];
}

export default function AppExoManagerPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exoToEdit, setExoToEdit] = useState<Exercise | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [expandedExoId, setExpandedExoId] = useState<string | null>(null);

  // 🔹 Charger exercices (filtrés si un cours est choisi)
  const fetchExercises = async (courseId?: string) => {
    let qRef;
    if (courseId) {
      qRef = query(
        collection(db, "app_exercises"),
        where("courseId", "==", courseId)
      );
    } else {
      qRef = collection(db, "app_exercises");
    }

    const qSnap = await getDocs(qRef);
    const exos = qSnap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        title: data.title,
        courseId: data.courseId,
        questions: data.questions || [],
      } as Exercise;
    });
    setExercises(exos);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet exercice ?")) return;
    await deleteDoc(doc(db, "app_exercises", id));
    fetchExercises(selectedCourseId);
  };

  useEffect(() => {
    fetchExercises(selectedCourseId);
  }, [selectedCourseId]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Gestion des exercices d'application
      </h1>

      {/* Formulaire de création / édition */}
      <AppExoForm
        exoToEdit={exoToEdit}
        setExoToEdit={setExoToEdit}
        onExoSaved={() => {
          setExoToEdit(null);
          fetchExercises(selectedCourseId);
        }}
        onCourseSelected={(courseId) => setSelectedCourseId(courseId)} // ✅ filtre appliqué
      />

      <hr className="my-6" />

      {/* Liste des exos existants */}
      <h2 className="text-2xl font-semibold mb-4">Exercices existants</h2>
      {exercises.length === 0 && <p>Aucun exercice pour le moment.</p>}

      {exercises.map((exo) => {
        const isExpanded = expandedExoId === exo.id;

        return (
          <div
            key={exo.id}
            className="bg-white shadow-md rounded-lg p-4 mb-4 border"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold">{exo.title}</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    setExpandedExoId(isExpanded ? null : exo.id)
                  }
                  className="bg-gray-200 text-black px-3 py-1 rounded hover:bg-gray-300"
                >
                  {isExpanded ? "Réduire" : "Voir plus"}
                </button>
                <button
                  onClick={() => setExoToEdit(exo)}
                  className="bg-yellow-400 text-black px-3 py-1 rounded hover:bg-yellow-500"
                >
                  Éditer
                </button>
                <button
                  onClick={() => handleDelete(exo.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Supprimer
                </button>
              </div>
            </div>

            {/* Contenu dépliable */}
            {isExpanded && (
              <div className="mt-3">
                {exo.questions.map((q, idx) => (
                  <div key={idx} className="mb-3">
                    <p className="font-medium">
                      {idx + 1}. {q.question}
                    </p>
                    <ul className="list-disc ml-5">
                      {q.options.map((opt, oidx) => (
                        <li
                          key={oidx}
                          className={
                            opt.isCorrect ? "font-bold text-green-600" : ""
                          }
                        >
                          {opt.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  getDocs,
} from "firebase/firestore";

interface Option {
  text: string;
  isCorrect: boolean;
}

interface Question {
  question: string;
  options: Option[];
}

interface Course {
  id: string;
  title: string;
}

interface AppExoFormProps {
  exoToEdit: any;
  setExoToEdit: (exo: any) => void;
  onExoSaved: () => void;
}

export default function AppExoForm({
  exoToEdit,
  setExoToEdit,
  onExoSaved,
}: AppExoFormProps) {
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { question: "", options: [{ text: "", isCorrect: false }] },
  ]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      const qSnap = await getDocs(collection(db, "courses"));
      setCourses(
        qSnap.docs.map((doc) => ({ id: doc.id, title: doc.data().title }))
      );
    };
    fetchCourses();
  }, []);

  // Remplit le formulaire si on passe en mode édition
  useEffect(() => {
    if (exoToEdit) {
      setTitle(exoToEdit.title || "");
      setQuestions(exoToEdit.questions || []);
      setSelectedCourse(exoToEdit.courseId || "");
    }
  }, [exoToEdit]);

  const resetForm = () => {
    setTitle("");
    setQuestions([{ question: "", options: [{ text: "", isCorrect: false }] }]);
    setSelectedCourse("");
    setExoToEdit(null); // 🔥 sort du mode édition
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert("Le titre est obligatoire");
    if (!selectedCourse) return alert("Sélectionnez un cours/vidéo");

    const payload = {
      title,
      courseId: selectedCourse,
      questions,
      createdAt: serverTimestamp(),
    };

    if (exoToEdit?.id) {
      await setDoc(doc(db, "app_exercises", exoToEdit.id), payload);
    } else {
      await addDoc(collection(db, "app_exercises"), payload);
    }

    resetForm();
    onExoSaved(); // 🔥 notifie le parent pour rafraîchir la liste
    alert("Exercice enregistré !");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-6 rounded shadow-md"
    >
      <input
        type="text"
        placeholder="Titre de l'exercice"
        className="border w-full p-2 rounded"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <select
        value={selectedCourse}
        onChange={(e) => setSelectedCourse(e.target.value)}
        className="border w-full p-2 rounded"
        required
      >
        <option value="">-- Sélectionner le cours/vidéo --</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>

      {/* Questions */}
      {questions.map((q, qIdx) => (
        <div key={qIdx} className="border p-3 rounded space-y-2">
          <div className="flex justify-between items-center mb-2">
            <input
              type="text"
              placeholder={`Question ${qIdx + 1}`}
              className="border p-2 rounded flex-1"
              value={q.question}
              onChange={(e) => {
                const newQ = [...questions];
                newQ[qIdx].question = e.target.value;
                setQuestions(newQ);
              }}
              required
            />
            <button
              type="button"
              onClick={() =>
                setQuestions(questions.filter((_, idx) => idx !== qIdx))
              }
              className="ml-2 text-red-500 font-bold text-lg"
            >
              ×
            </button>
          </div>

          {q.options.map((opt, optIdx) => (
            <div key={optIdx} className="flex items-center space-x-2 mb-1">
              <input
                type="checkbox"
                checked={opt.isCorrect}
                onChange={() => {
                  const newQ = [...questions];
                  newQ[qIdx].options[optIdx].isCorrect =
                    !newQ[qIdx].options[optIdx].isCorrect;
                  setQuestions(newQ);
                }}
              />
              <input
                type="text"
                placeholder={`Réponse ${optIdx + 1}`}
                className="flex-1 border p-2 rounded"
                value={opt.text}
                onChange={(e) => {
                  const newQ = [...questions];
                  newQ[qIdx].options[optIdx].text = e.target.value;
                  setQuestions(newQ);
                }}
                required
              />
              <button
                type="button"
                onClick={() => {
                  const newQ = [...questions];
                  newQ[qIdx].options = newQ[qIdx].options.filter(
                    (_, idx) => idx !== optIdx
                  );
                  setQuestions(newQ);
                }}
                className="text-red-500 font-bold"
              >
                ×
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              const newQ = [...questions];
              newQ[qIdx].options.push({ text: "", isCorrect: false });
              setQuestions(newQ);
            }}
            className="bg-gray-300 text-black px-3 py-1 rounded hover:bg-gray-400"
          >
            Ajouter une réponse
          </button>
        </div>
      ))}

      <div className="flex space-x-2">
        <button
          type="button"
          onClick={() =>
            setQuestions([
              ...questions,
              { question: "", options: [{ text: "", isCorrect: false }] },
            ])
          }
          className="bg-gray-300 text-black px-3 py-1 rounded hover:bg-gray-400"
        >
          Ajouter une question
        </button>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {exoToEdit ? "Mettre à jour" : "Enregistrer"}
        </button>

        {/* Bouton Annuler visible seulement en mode édition */}
        {exoToEdit && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              onExoSaved();
            }}
            className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}

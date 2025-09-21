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
  query,
  where,
} from "firebase/firestore";
import LatexInput from "./LatexInput"; // ✅ ton input LaTeX

interface Option {
  text: string;
  isCorrect: boolean;
}

interface Question {
  question: string;
  options: Option[];
}

interface Level {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Course {
  id: string;
  title: string;
  level_id: string;
  subject_id: string;
}

interface Video {
  id: string;
  title: string;
}



interface AppExoFormProps {
  exoToEdit: any;
  setExoToEdit: (exo: any) => void;
  onExoSaved: () => void;
  onCourseSelected?: (courseId: string) => void; // ✅
}


export default function AppExoForm({
  exoToEdit,
  setExoToEdit,
  onExoSaved,
   onCourseSelected, // ✅ ajouter ici
}: AppExoFormProps) {
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { question: "", options: [{ text: "", isCorrect: false }] },
  ]);

  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);

  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [videoAfter, setVideoAfter] = useState("");

  // 🔹 Charger niveaux et matières
  useEffect(() => {
    const fetchLevelsSubjects = async () => {
      const levelsSnap = await getDocs(collection(db, "levels"));
      setLevels(levelsSnap.docs.map(d => ({ id: d.id, name: d.data().name })));

      const subjectsSnap = await getDocs(collection(db, "subjects"));
      setSubjects(subjectsSnap.docs.map(d => ({ id: d.id, name: d.data().name })));
    };
    fetchLevelsSubjects();
  }, []);

  // 🔹 Charger les cours filtrés
  useEffect(() => {
    const fetchCourses = async () => {
      const snap = await getDocs(collection(db, "courses"));
      const allCourses = snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));

      const filtered = allCourses.filter(
        c =>
          (selectedLevel ? c.level_id === selectedLevel : true) &&
          (selectedSubject ? c.subject_id === selectedSubject : true)
      );

      setCourses(filtered);
    };
    fetchCourses();
  }, [selectedLevel, selectedSubject]);

  // 🔹 Charger les vidéos du cours sélectionné
  useEffect(() => {
    const fetchVideos = async () => {
      if (!selectedCourse) return setVideos([]);
      const snap = await getDocs(
        query(collection(db, "videos"), where("courseId", "==", selectedCourse))
      );
      setVideos(snap.docs.map(d => ({ id: d.id, title: d.data().title })));
    };
    fetchVideos();
  }, [selectedCourse]);

  // 🔹 Pré-remplissage si édition
  useEffect(() => {
    if (exoToEdit) {
      setTitle(exoToEdit.title || "");
      setQuestions(exoToEdit.questions || [
        { question: "", options: [{ text: "", isCorrect: false }] },
      ]);
      setSelectedLevel(exoToEdit.level_id || "");
      setSelectedSubject(exoToEdit.subject_id || "");
      setSelectedCourse(exoToEdit.courseId || "");
      setVideoAfter(exoToEdit.videoAfter || "");
    }
  }, [exoToEdit]);

  // 🔹 Reset
  const resetForm = () => {
    setTitle("");
    setQuestions([{ question: "", options: [{ text: "", isCorrect: false }] }]);
    setSelectedLevel("");
    setSelectedSubject("");
    setSelectedCourse("");
    setVideoAfter("");
    setExoToEdit(null);
  };

  // 🔹 Sauvegarde
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert("Le titre est obligatoire");
    if (!selectedCourse) return alert("Sélectionnez un cours");

    const payload = {
      title,
      level_id: selectedLevel,
      subject_id: selectedSubject,
      courseId: selectedCourse,
      questions,
      videoAfter,
      updatedAt: serverTimestamp(),
    };

    if (exoToEdit?.id) {
      // ⚠️ merge:true → garde les anciens champs non modifiés
      await setDoc(doc(db, "app_exercises", exoToEdit.id), payload, { merge: true });
    } else {
      await addDoc(collection(db, "app_exercises"), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }

    resetForm();
    onExoSaved();
    alert("Exercice enregistré !");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow-md">
      <input
        type="text"
        placeholder="Titre de l'exercice"
        className="border w-full p-2 rounded"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
      />

      {/* Sélecteurs */}
      <select
        value={selectedLevel}
        onChange={e => setSelectedLevel(e.target.value)}
        className="border w-full p-2 rounded"
      >
        <option value="">-- Sélectionner le niveau --</option>
        {levels.map(l => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>

      <select
        value={selectedSubject}
        onChange={e => setSelectedSubject(e.target.value)}
        className="border w-full p-2 rounded"
      >
        <option value="">-- Sélectionner la matière --</option>
        {subjects.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <select
  value={selectedCourse}
  onChange={(e) => {
    setSelectedCourse(e.target.value);
    onCourseSelected?.(e.target.value); // ✅ notifie le parent
  }}
  className="border w-full p-2 rounded"
>
  <option value="">-- Sélectionner le cours --</option>
  {courses.map((c) => (
    <option key={c.id} value={c.id}>{c.title}</option>
  ))}
</select>

      <select
        value={videoAfter}
        onChange={e => setVideoAfter(e.target.value)}
        className="border w-full p-2 rounded"
      >
        <option value="">-- Vidéo après laquelle insérer l'exercice --</option>
        {videos.map(v => (
          <option key={v.id} value={v.id}>{v.title}</option>
        ))}
      </select>

      {/* Questions */}
      {questions.map((q, qIdx) => (
        <div key={qIdx} className="border p-3 rounded space-y-2">
          <div className="flex justify-between items-start mb-2">
            <LatexInput
              value={q.question}
              placeholder={`Question ${qIdx + 1}`}
              onChange={(val) => {
                const newQ = [...questions];
                newQ[qIdx].question = val;
                setQuestions(newQ);
              }}
            />
            <button
              type="button"
              onClick={() => setQuestions(questions.filter((_, idx) => idx !== qIdx))}
              className="ml-2 text-red-500 font-bold text-lg"
            >×</button>
          </div>

          {q.options.map((opt, optIdx) => (
            <div key={optIdx} className="flex items-center space-x-2 mb-1">
              <input
                type="checkbox"
                checked={opt.isCorrect}
                onChange={() => {
                  const newQ = [...questions];
                  newQ[qIdx].options[optIdx].isCorrect = !newQ[qIdx].options[optIdx].isCorrect;
                  setQuestions(newQ);
                }}
              />
              <LatexInput
                value={opt.text}
                placeholder={`Réponse ${optIdx + 1}`}
                onChange={(val) => {
                  const newQ = [...questions];
                  newQ[qIdx].options[optIdx].text = val;
                  setQuestions(newQ);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const newQ = [...questions];
                  newQ[qIdx].options = newQ[qIdx].options.filter((_, idx) => idx !== optIdx);
                  setQuestions(newQ);
                }}
                className="text-red-500 font-bold"
              >×</button>
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
          >Ajouter une réponse</button>
        </div>
      ))}

      {/* Boutons */}
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={() =>
            setQuestions([...questions, { question: "", options: [{ text: "", isCorrect: false }] }])
          }
          className="bg-gray-300 text-black px-3 py-1 rounded hover:bg-gray-400"
        >Ajouter une question</button>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >{exoToEdit ? "Mettre à jour" : "Enregistrer"}</button>

        {exoToEdit && (
          <button
            type="button"
            onClick={() => { resetForm(); onExoSaved(); }}
            className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500"
          >Annuler</button>
        )}
      </div>
    </form>
  );
}

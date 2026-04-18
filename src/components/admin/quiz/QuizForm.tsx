// src/components/admin/quiz/QuizForm.tsx
"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";

import QuizMetaForm from "./QuizMetaForm";
import QuizQuestionsForm from "./QuizQuestionsForm";
import { Course, Video, Question, Quiz } from "./types";

interface QuizFormProps {
  courses: Course[];
  videos: Video[];
  selectedCourse: string;
  setSelectedCourse: (id: string) => void;
  selectedVideo: string;
  setSelectedVideo: (id: string) => void;
  editingQuiz?: Quiz | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

export default function QuizForm({
  courses,
  videos,
  selectedCourse,
  setSelectedCourse,
  selectedVideo,
  setSelectedVideo,
  editingQuiz,
  onSaved,
  onCancel,
}: QuizFormProps) {
  const [minute, setMinute] = useState("");
  const [second, setSecond] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  // Pré-remplir le formulaire quand on passe en mode édition
  useEffect(() => {
    if (editingQuiz) {
      setMinute(String(Math.floor(editingQuiz.timestamp / 60)));
      setSecond(String(editingQuiz.timestamp % 60));
      setQuestions(editingQuiz.questions);
    } else {
      setMinute("");
      setSecond("");
      setQuestions([]);
    }
  }, [editingQuiz]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { text: "", answers: [{ text: "", correct: false }] },
    ]);
  };

  const updateQuestionText = (qIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].text = value;
    setQuestions(updated);
  };

  const addAnswer = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].answers.push({ text: "", correct: false });
    setQuestions(updated);
  };

  const updateAnswer = (
    qIndex: number,
    aIndex: number,
    field: "text" | "correct",
    value: string | boolean
  ) => {
    const updated = [...questions];
    if (field === "text") updated[qIndex].answers[aIndex].text = value as string;
    else updated[qIndex].answers[aIndex].correct = value as boolean;
    setQuestions(updated);
  };

  const saveQuiz = async () => {
    const timestamp = (Number(minute) || 0) * 60 + (Number(second) || 0);

    if (!selectedVideo || questions.length === 0) {
      alert("Veuillez sélectionner une vidéo et ajouter des questions.");
      return;
    }

    if (editingQuiz) {
      await updateDoc(doc(db, "quizzes", editingQuiz.id), {
        courseId: selectedCourse,
        videoId: selectedVideo,
        timestamp,
        questions,
      });
      alert("Quiz mis à jour !");
    } else {
      await addDoc(collection(db, "quizzes"), {
        courseId: selectedCourse,
        videoId: selectedVideo,
        timestamp,
        questions,
        createdAt: new Date(),
      });
      alert("Quiz enregistré !");
    }

    setQuestions([]);
    setSelectedCourse("");
    setSelectedVideo("");
    setMinute("");
    setSecond("");
    onSaved?.();
  };

  return (
    <div className="p-4 max-w-3xl mx-auto bg-white shadow rounded">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">
          {editingQuiz ? "Modifier le Quiz" : "Créer un Quiz"}
        </h2>
        {editingQuiz && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Annuler
          </button>
        )}
      </div>

      <QuizMetaForm
        courses={courses}
        videos={videos}
        selectedCourse={selectedCourse}
        setSelectedCourse={setSelectedCourse}
        selectedVideo={selectedVideo}
        setSelectedVideo={setSelectedVideo}
        minute={minute}
        setMinute={setMinute}
        second={second}
        setSecond={setSecond}
      />

      {selectedVideo && (
        <QuizQuestionsForm
          questions={questions}
          updateQuestionText={updateQuestionText}
          updateAnswer={updateAnswer}
          addAnswer={addAnswer}
          addQuestion={addQuestion}
          saveQuiz={saveQuiz}
        />
      )}
    </div>
  );
}

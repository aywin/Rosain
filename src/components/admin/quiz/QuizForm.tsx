// QuizForm.tsx
"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";

import QuizMetaForm from "./QuizMetaForm";
import QuizQuestionsForm from "./QuizQuestionsForm";
import { Course, Video, Question } from "./types";

export default function QuizForm() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");
  const [minute, setMinute] = useState("");
  const [second, setSecond] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const fetchCourses = async () => {
      const snapshot = await getDocs(collection(db, "courses"));
      setCourses(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title as string,
        }))
      );
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    const fetchVideos = async () => {
      if (!selectedCourse) return;
      const q = query(
        collection(db, "videos"),
        where("courseId", "==", selectedCourse)
      );
      const snapshot = await getDocs(q);
      setVideos(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title as string,
        }))
      );
    };
    fetchVideos();
  }, [selectedCourse]);

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

    await addDoc(collection(db, "quizzes"), {
      courseId: selectedCourse,
      videoId: selectedVideo,
      timestamp,
      questions,
      createdAt: new Date(),
    });

    alert("Quiz enregistré !");
    setQuestions([]);
    setSelectedCourse("");
    setSelectedVideo("");
    setVideos([]);
    setMinute("");
    setSecond("");
  };

  return (
    <div className="p-4 max-w-3xl mx-auto bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-4">Créer un Quiz</h2>

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

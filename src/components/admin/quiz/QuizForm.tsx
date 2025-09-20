"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";

import QuizMetaForm from "./QuizMetaForm";
import QuizQuestionsForm from "./QuizQuestionsForm";
import { Course, Video, Question } from "./types";

interface QuizFormProps {
  courses?: Course[];
  videos?: Video[];
  selectedCourse?: string;
  setSelectedCourse?: (id: string) => void;
  selectedVideo?: string;
  setSelectedVideo?: (id: string) => void;
}

export default function QuizForm({
  courses: initialCourses,
  videos: initialVideos,
  selectedCourse: initialSelectedCourse,
  setSelectedCourse: setParentSelectedCourse,
  selectedVideo: initialSelectedVideo,
  setSelectedVideo: setParentSelectedVideo,
}: QuizFormProps) {
  const [courses, setCourses] = useState<Course[]>(initialCourses || []);
  const [videos, setVideos] = useState<Video[]>(initialVideos || []);
  const [selectedCourse, setSelectedCourse] = useState(initialSelectedCourse || "");
  const [selectedVideo, setSelectedVideo] = useState(initialSelectedVideo || "");
  const [minute, setMinute] = useState("");
  const [second, setSecond] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  // Récupérer les cours si non passés en props
  useEffect(() => {
    if (initialCourses) return;
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
  }, [initialCourses]);

  // Récupérer les vidéos selon le cours sélectionné si non passées en props
  useEffect(() => {
    if (initialVideos || !selectedCourse) return;
    const fetchVideos = async () => {
      const q = query(collection(db, "videos"), where("courseId", "==", selectedCourse));
      const snapshot = await getDocs(q);
      setVideos(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title as string,
          courseId: doc.data().courseId as string,
        }))
      );
    };
    fetchVideos();
  }, [selectedCourse, initialVideos]);

  // Synchroniser avec le parent si nécessaire
  useEffect(() => {
    if (setParentSelectedCourse) setParentSelectedCourse(selectedCourse);
  }, [selectedCourse, setParentSelectedCourse]);

  useEffect(() => {
    if (setParentSelectedVideo) setParentSelectedVideo(selectedVideo);
  }, [selectedVideo, setParentSelectedVideo]);

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

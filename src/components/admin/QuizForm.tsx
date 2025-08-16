// components/quiz/QuizForm.tsx
"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
} from "firebase/firestore";

interface Course {
  id: string;
  title: string;
}

interface Video {
  id: string;
  title: string;
}

interface Answer {
  text: string;
  correct: boolean;
}

interface Question {
  text: string;
  answers: Answer[];
}

export default function QuizForm() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");

  // ✅ minute/seconde stockées en string pour laisser le placeholder s'afficher
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
    if (field === "text") {
      updated[qIndex].answers[aIndex].text = value as string;
    } else {
      updated[qIndex].answers[aIndex].correct = value as boolean;
    }
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

      <label className="block mb-2 font-semibold">Cours</label>
      <select
        value={selectedCourse}
        onChange={(e) => setSelectedCourse(e.target.value)}
        className="border rounded p-2 w-full mb-4"
      >
        <option value="">-- Sélectionnez un cours --</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title}
          </option>
        ))}
      </select>

      {videos.length > 0 && (
        <>
          <label className="block mb-2 font-semibold">Vidéo</label>
          <select
            value={selectedVideo}
            onChange={(e) => setSelectedVideo(e.target.value)}
            className="border rounded p-2 w-full mb-4"
          >
            <option value="">-- Sélectionnez une vidéo --</option>
            {videos.map((video) => (
              <option key={video.id} value={video.id}>
                {video.title}
              </option>
            ))}
          </select>
        </>
      )}

      {selectedVideo && (
        <>
          <label className="block mb-2 font-semibold">
            Moment d'apparition du quiz
          </label>
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              placeholder="Minutes"
              value={minute}
              min={0}
              onChange={(e) => setMinute(e.target.value)}
              className="border rounded p-2 w-1/2"
            />
            <input
              type="number"
              placeholder="Secondes"
              value={second}
              min={0}
              max={59}
              onChange={(e) => setSecond(e.target.value)}
              className="border rounded p-2 w-1/2"
            />
          </div>
        </>
      )}

      {selectedVideo && (
        <>
          <div className="mb-4">
            {questions.map((question, qIndex) => (
              <div
                key={qIndex}
                className="border rounded p-3 mb-4 bg-gray-50"
              >
                <input
                  type="text"
                  value={question.text}
                  onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                  placeholder={`Question ${qIndex + 1}`}
                  className="border rounded p-2 w-full mb-3"
                />

                {question.answers.map((answer, aIndex) => (
                  <div key={aIndex} className="flex items-center mb-2">
                    <input
                      type="text"
                      value={answer.text}
                      onChange={(e) =>
                        updateAnswer(qIndex, aIndex, "text", e.target.value)
                      }
                      placeholder={`Réponse ${aIndex + 1}`}
                      className="border rounded p-2 flex-1 mr-2"
                    />
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={answer.correct}
                        onChange={(e) =>
                          updateAnswer(
                            qIndex,
                            aIndex,
                            "correct",
                            e.target.checked
                          )
                        }
                        className="mr-1"
                      />
                      Correcte
                    </label>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addAnswer(qIndex)}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  + Ajouter une réponse
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addQuestion}
            className="bg-green-500 text-white px-4 py-2 rounded mr-2"
          >
            + Ajouter une question
          </button>
          <button
            type="button"
            onClick={saveQuiz}
            className="bg-purple-600 text-white px-4 py-2 rounded"
          >
            Sauvegarder le Quiz
          </button>
        </>
      )}
    </div>
  );
}

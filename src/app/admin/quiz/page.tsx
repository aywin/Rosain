"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";

import QuizForm from "@/components/admin/quiz/QuizForm";
import { Course, Quiz, Video } from "@/components/admin/quiz/types";

export default function QuizPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  // Récupérer les cours
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

  // Récupérer les vidéos
  useEffect(() => {
    const fetchVideos = async () => {
      const snapshot = await getDocs(collection(db, "videos"));
      setVideos(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title as string,
          courseId: doc.data().courseId as string,
        }))
      );
    };
    fetchVideos();
  }, []);

  // Récupérer les quizzes filtrés par cours et vidéo
  useEffect(() => {
    const fetchQuizzes = async () => {
      const conditions = [];
      if (selectedCourse) conditions.push(where("courseId", "==", selectedCourse));
      if (selectedVideo) conditions.push(where("videoId", "==", selectedVideo));

      const qRef = conditions.length
        ? query(collection(db, "quizzes"), ...conditions)
        : collection(db, "quizzes");

      const snapshot = await getDocs(qRef);
      setQuizzes(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Quiz, "id">),
        }))
      );
    };
    fetchQuizzes();
  }, [selectedCourse, selectedVideo]);

  // Rafraîchir la liste après sauvegarde
  const handleSaved = async () => {
    setEditingQuiz(null);
    setSelectedCourse("");
    setSelectedVideo("");
    const snapshot = await getDocs(collection(db, "quizzes"));
    setQuizzes(
      snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Quiz, "id">) }))
    );
  };

  // Passer en mode édition
  const handleEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setSelectedCourse(quiz.courseId);
    setSelectedVideo(quiz.videoId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Supprimer un quiz
  const handleDelete = async (quizId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce quiz ?")) return;
    await deleteDoc(doc(db, "quizzes", quizId));
    setQuizzes(quizzes.filter((q) => q.id !== quizId));
  };

  // Obtenir le titre d'un cours ou d'une vidéo
  const getCourseTitle = (courseId: string) =>
    courses.find((c) => c.id === courseId)?.title || courseId;
  const getVideoTitle = (videoId: string) =>
    videos.find((v) => v.id === videoId)?.title || videoId;

  // Filtrer les vidéos selon le cours sélectionné
  const filteredVideos = selectedCourse
    ? videos.filter((v) => v.courseId === selectedCourse)
    : videos;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Formulaire de création */}
      <div className="bg-white shadow rounded p-6">
        <QuizForm
          courses={courses}
          videos={filteredVideos}
          selectedCourse={selectedCourse}
          setSelectedCourse={setSelectedCourse}
          selectedVideo={selectedVideo}
          setSelectedVideo={setSelectedVideo}
          editingQuiz={editingQuiz}
          onSaved={handleSaved}
          onCancel={() => { setEditingQuiz(null); setSelectedCourse(""); setSelectedVideo(""); }}
        />
      </div>

      {/* Liste des quizzes */}
      <div className="bg-white shadow rounded p-6 space-y-4">
        <h2 className="text-xl font-bold mb-4">Liste des Quiz</h2>
        {quizzes.length === 0 ? (
          <p>Aucun quiz trouvé.</p>
        ) : (
          quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="border p-4 rounded flex justify-between items-center"
            >
              <div>
                <p><strong>Cours :</strong> {getCourseTitle(quiz.courseId)}</p>
                <p><strong>Vidéo :</strong> {getVideoTitle(quiz.videoId)}</p>
                <p><strong>Timestamp :</strong> {Math.floor(quiz.timestamp / 60)}m {quiz.timestamp % 60}s</p>
                <p><strong>Questions :</strong> {quiz.questions.length}</p>
              </div>
              <div className="space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                  onClick={() => handleEdit(quiz)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-red-500 text-white rounded"
                  onClick={() => handleDelete(quiz.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

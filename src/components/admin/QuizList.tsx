"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

interface Quiz {
  id: string;
  videoId: string;
  courseId: string;
  timestamp: number;
  questions: {
    text: string;
    answers: { text: string; correct: boolean }[];
  }[];
}

interface Video {
  id: string;
  title: string;
}

interface Course {
  id: string;
  title: string;
}

export default function QuizList({ courseId }: { courseId?: string }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [videos, setVideos] = useState<Record<string, Video>>({});
  const [courses, setCourses] = useState<Record<string, Course>>({});

  useEffect(() => {
    const fetchData = async () => {
      // 📌 1. Récupérer les quiz
      let qRef = collection(db, "quizzes");
      if (courseId) {
        qRef = query(collection(db, "quizzes"), where("courseId", "==", courseId)) as any;
      }
      const snapshot = await getDocs(qRef);
      const quizData: Quiz[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Quiz[];

      setQuizzes(quizData);

      // 📌 2. Récupérer toutes les vidéos liées
      const videoIds = [...new Set(quizData.map((q) => q.videoId))];
      const videoSnapshot = await getDocs(collection(db, "videos"));
      const videoMap: Record<string, Video> = {};
      videoSnapshot.forEach((doc) => {
        if (videoIds.includes(doc.id)) {
          videoMap[doc.id] = { id: doc.id, title: doc.data().title };
        }
      });
      setVideos(videoMap);

      // 📌 3. Récupérer les cours liés
      const courseIds = [...new Set(quizData.map((q) => q.courseId))];
      const courseSnapshot = await getDocs(collection(db, "courses"));
      const courseMap: Record<string, Course> = {};
      courseSnapshot.forEach((doc) => {
        if (courseIds.includes(doc.id)) {
          courseMap[doc.id] = { id: doc.id, title: doc.data().title };
        }
      });
      setCourses(courseMap);
    };

    fetchData();
  }, [courseId]);

  return (
    <div className="space-y-6">
      {quizzes.length === 0 ? (
        <p className="text-gray-500">Aucun quiz trouvé.</p>
      ) : (
        quizzes.map((quiz) => (
          <div key={quiz.id} className="border rounded p-4 bg-white shadow">
            <h3 className="text-lg font-bold">
              🎥 {videos[quiz.videoId]?.title || "Vidéo inconnue"}
            </h3>
            <p className="text-sm text-gray-500">
              📚 {courses[quiz.courseId]?.title || "Cours inconnu"} — ⏱{" "}
              {Math.floor(quiz.timestamp / 60)}:{quiz.timestamp % 60}s
            </p>
            <div className="mt-3 space-y-3">
              {quiz.questions.map((q, idx) => (
                <div key={idx} className="border p-3 rounded bg-gray-50">
                  <p className="font-semibold">❓ {q.text}</p>
                  <ul className="list-disc ml-5 mt-2">
                    {q.answers.map((ans, i) => (
                      <li
                        key={i}
                        className={ans.correct ? "text-green-600 font-medium" : ""}
                      >
                        {ans.text} {ans.correct && "✔"}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

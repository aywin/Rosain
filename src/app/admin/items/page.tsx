'use client';

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

interface Level { id: string; name: string; }
interface Subject { id: string; name: string; }
interface Course { id: string; title: string; level_id: string; subject_id: string; }
interface Video { id: string; title: string; order: number; }
interface AppExo { id: string; title: string; videoAfter: string; }

export default function VideosWithExosPage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [appExos, setAppExos] = useState<AppExo[]>([]);

  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  // Charger levels & subjects
  useEffect(() => {
    const fetchLevelsSubjects = async () => {
      const levelsSnap = await getDocs(collection(db, "levels"));
      setLevels(levelsSnap.docs.map(d => ({ id: d.id, name: d.data().name })));
      const subjectsSnap = await getDocs(collection(db, "subjects"));
      setSubjects(subjectsSnap.docs.map(d => ({ id: d.id, name: d.data().name })));
    };
    fetchLevelsSubjects();
  }, []);

  // Charger courses filtrés
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

  // Charger vidéos + appExos pour le cours sélectionné
  useEffect(() => {
    if (!selectedCourse) {
      setVideos([]);
      setAppExos([]);
      return;
    }

    const fetchVideosExos = async () => {
      // Vidéos
      const videoSnap = await getDocs(
        query(collection(db, "videos"), where("courseId", "==", selectedCourse))
      );
      const vids = videoSnap.docs.map(d => ({ id: d.id, ...d.data() } as Video))
                                 .sort((a,b) => (a.order || 0) - (b.order || 0));
      setVideos(vids);

      // AppExos
      const exoSnap = await getDocs(
        query(collection(db, "app_exercises"), where("courseId", "==", selectedCourse))
      );
      const exos = exoSnap.docs.map(d => ({ id: d.id, ...d.data() } as AppExo));
      setAppExos(exos);
    };

    fetchVideosExos();
  }, [selectedCourse]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex space-x-2">
        <select
          value={selectedLevel}
          onChange={e => setSelectedLevel(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">-- Sélectionner le niveau --</option>
          {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        <select
          value={selectedSubject}
          onChange={e => setSelectedSubject(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">-- Sélectionner la matière --</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <select
          value={selectedCourse}
          onChange={e => setSelectedCourse(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">-- Sélectionner le cours --</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {/* Affichage vidéos + appExos */}
      {videos.map(video => (
        <div key={video.id} className="mb-4">
          <h3 className="font-bold">🎬 {video.order}. {video.title}</h3>

          <ul className="ml-6">
            {appExos
              .filter(exo => exo.videoAfter=== video.id)
              .map(exo => (
                <li key={exo.id}>📝 {exo.title}</li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

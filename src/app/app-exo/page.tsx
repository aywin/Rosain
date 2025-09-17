"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";
import { FaCheckCircle, FaSpinner } from "react-icons/fa";

interface Level { id: string; name: string; }
interface Subject { id: string; name: string; }
interface Course { id: string; title: string; level_id: string; subject_id: string; }
interface Exo { id: string; title: string; questions: Question[]; courseId: string; }
interface Question { question: string; options: Option[]; }
interface Option { text: string; isCorrect: boolean; }

export default function AppExoPlayerPage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [exos, setExos] = useState<Exo[]>([]);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [completedExos, setCompletedExos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const levelsSnap = await getDocs(collection(db, "levels"));
        setLevels(levelsSnap.docs.map(d => ({ id: d.id, name: d.data().name })));
        const subjectsSnap = await getDocs(collection(db, "subjects"));
        setSubjects(subjectsSnap.docs.map(d => ({ id: d.id, name: d.data().name })));
      } catch (error) {
        console.error("Erreur lors du chargement des niveaux/matières :", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const snap = await getDocs(collection(db, "courses"));
        const allCourses = snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
        const filtered = allCourses.filter(
          c => (selectedLevel ? c.level_id === selectedLevel : true) &&
               (selectedSubject ? c.subject_id === selectedSubject : true)
        );
        setCourses(filtered);
      } catch (error) {
        console.error("Erreur lors du chargement des cours :", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, [selectedLevel, selectedSubject]);

  useEffect(() => {
    const fetchExos = async () => {
      if (!selectedCourse) return setExos([]);
      setIsLoading(true);
      try {
        const snap = await getDocs(query(collection(db, "app_exercises"), where("courseId", "==", selectedCourse)));
        setExos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Exo)));
      } catch (error) {
        console.error("Erreur lors du chargement des exercices :", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExos();
  }, [selectedCourse]);

  useEffect(() => {
    // Charger les exercices complétés depuis localStorage
    const savedCompleted = localStorage.getItem("completedExos");
    if (savedCompleted) {
      setCompletedExos(JSON.parse(savedCompleted));
    }
  }, []);

  useEffect(() => {
    // Sauvegarder les exercices complétés dans localStorage
    localStorage.setItem("completedExos", JSON.stringify(completedExos));
  }, [completedExos]);

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Exercices</h1>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={selectedLevel}
          onChange={e => setSelectedLevel(e.target.value)}
          className="border p-2 rounded focus:ring-2 focus:ring-blue-500"
          aria-label="Sélectionner un niveau"
        >
          <option value="">-- Niveau --</option>
          {levels.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        <select
          value={selectedSubject}
          onChange={e => setSelectedSubject(e.target.value)}
          className="border p-2 rounded focus:ring-2 focus:ring-blue-500"
          aria-label="Sélectionner une matière"
        >
          <option value="">-- Matière --</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          value={selectedCourse}
          onChange={e => setSelectedCourse(e.target.value)}
          className="border p-2 rounded focus:ring-2 focus:ring-blue-500"
          aria-label="Sélectionner un cours"
        >
          <option value="">-- Cours --</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {/* Indicateur de chargement */}
      {isLoading && (
        <div className="flex justify-center items-center">
          <FaSpinner className="animate-spin text-blue-600 text-2xl" />
        </div>
      )}

      {/* Message si aucun exercice */}
      {!isLoading && selectedCourse && exos.length === 0 && (
        <p className="text-gray-500">Aucun exercice disponible pour ce cours.</p>
      )}

      {/* Liste des exercices */}
      {!isLoading && exos.map(exo => (
        <div key={exo.id} className="border rounded-lg shadow-sm bg-white">
          <Link
            href={`/app-exo/${exo.id}`}
            className="flex items-center justify-between p-4 font-semibold text-lg hover:bg-gray-100 transition-colors"
            aria-label={`Ouvrir l'exercice ${exo.title}`}
          >
            <span>{exo.title}</span>
            {completedExos.includes(exo.id) && (
              <FaCheckCircle className="text-green-500" />
            )}
          </Link>
        </div>
      ))}
    </div>
  );
}
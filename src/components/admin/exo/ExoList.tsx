"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, getDocs, deleteDoc, doc, setDoc } from "firebase/firestore";
import ExoForm from "./ExoForm";

interface Exo {
  id: string;
  title: string;
  description: string;
  level_id: string;
  subject_id: string;
  course_id: string;
  statement_text: string;
  solution_text: string;
  order: number;
  tags: string[];
}

interface NameMap {
  [id: string]: string;
}

// 🔹 Props pour accepter refreshTrigger
interface ExoListProps {
  refreshTrigger: number;
}

export default function ExoList({ refreshTrigger }: ExoListProps) {
  const [exos, setExos] = useState<Exo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Exo | null>(null);

  const [levelMap, setLevelMap] = useState<NameMap>({});
  const [subjectMap, setSubjectMap] = useState<NameMap>({});
  const [courseMap, setCourseMap] = useState<NameMap>({});

  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  // Charger tous les exos + mappings id → name
  const fetchData = async () => {
    setLoading(true);

    // Exos
    const snapExos = await getDocs(collection(db, "exercises"));
    const exosData: Exo[] = snapExos.docs.map((d) => ({ id: d.id, ...d.data() } as Exo));
    setExos(exosData);

    // Niveaux
    const snapLevels = await getDocs(collection(db, "levels"));
    const lMap: NameMap = {};
    snapLevels.docs.forEach((d) => { lMap[d.id] = d.data().name; });
    setLevelMap(lMap);

    // Matières
    const snapSubjects = await getDocs(collection(db, "subjects"));
    const sMap: NameMap = {};
    snapSubjects.docs.forEach((d) => { sMap[d.id] = d.data().name; });
    setSubjectMap(sMap);

    // Cours
    const snapCourses = await getDocs(collection(db, "courses"));
    const cMap: NameMap = {};
    snapCourses.docs.forEach((d) => { cMap[d.id] = d.data().title; });
    setCourseMap(cMap);

    setLoading(false);
  };

  // 🔹 Se recharge automatiquement si refreshTrigger change
  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet exercice ?")) return;
    await deleteDoc(doc(db, "exercises", id));
    fetchData();
  };

  const handleSaveEdit = async (data: any) => {
    if (!editing) return;
    const ref = doc(db, "exercises", editing.id);
    await setDoc(ref, data, { merge: true });
    setEditing(null);
    fetchData();
  };

  // Filtrer par nom lisible
  const filteredExos = exos.filter((e) => {
    return (
      (!selectedLevel || levelMap[e.level_id] === selectedLevel) &&
      (!selectedSubject || subjectMap[e.subject_id] === selectedSubject) &&
      (!selectedCourse || courseMap[e.course_id] === selectedCourse)
    );
  });

  // Options uniques pour select
  const levelOptions = Array.from(new Set(exos.map((e) => levelMap[e.level_id]).filter(Boolean)));
  const subjectOptions = Array.from(new Set(exos.map((e) => subjectMap[e.subject_id]).filter(Boolean)));
  const courseOptions = Array.from(new Set(exos.map((e) => courseMap[e.course_id]).filter(Boolean)));

  if (editing) {
    return <ExoForm initial={editing} editMode onCancel={() => setEditing(null)} onSubmit={handleSaveEdit} />;
  }

  return (
    <div>
      {/* Filtres */}
      <div className="flex gap-4 mb-4 flex-wrap">
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="">Tous les niveaux</option>
          {levelOptions.map((lvl) => (
            <option key={lvl} value={lvl}>{lvl}</option>
          ))}
        </select>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="">Toutes les matières</option>
          {subjectOptions.map((sub) => (
            <option key={sub} value={sub}>{sub}</option>
          ))}
        </select>

        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="">Tous les cours</option>
          {courseOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500 italic">Chargement...</p>
      ) : filteredExos.length === 0 ? (
        <p className="text-gray-500 italic">Aucun exercice trouvé.</p>
      ) : (
        <ul className="space-y-2">
          {filteredExos.map((exo) => (
            <li
              key={exo.id}
              className="flex justify-between items-center border p-2 rounded hover:bg-gray-50 transition"
            >
              <span>{exo.title}</span>
              <div className="flex gap-2">
                <button
                  className="bg-yellow-400 px-2 py-1 rounded"
                  onClick={() => setEditing(exo)}
                >
                  ✏️ Edit
                </button>
                <button
                  className="bg-red-500 text-white px-2 py-1 rounded"
                  onClick={() => handleDelete(exo.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

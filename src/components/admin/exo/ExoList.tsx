"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import ExoForm from "./ExoForm";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";


interface Exo {
  id: string;
  title: string;
  description: string;
  course_id: string;
  statement_text: string;
  solution_text: string;
  order: number;
  tags: string[];
}

interface Course {
  id: string;
  title: string;
  levelId: string;
  subjectId: string;
}

interface NameMap {
  [id: string]: string;
}

interface ExoListProps {
  refreshTrigger: number;
}

export default function ExoList({ refreshTrigger }: ExoListProps) {
  const [exos, setExos] = useState<Exo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Exo | null>(null);

  const [levelMap, setLevelMap] = useState<NameMap>({});
  const [subjectMap, setSubjectMap] = useState<NameMap>({});
  const [courseMap, setCourseMap] = useState<{ [id: string]: Course }>({});

  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  // 🔹 Charger exos + levels + subjects + courses
  const fetchData = async () => {
    setLoading(true);

    // Exos
    const snapExos = await getDocs(collection(db, "exercises"));
    const exosData: Exo[] = snapExos.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Exo)
    );
    setExos(exosData);

    // Levels
    const snapLevels = await getDocs(collection(db, "levels"));
    const lMap: NameMap = {};
    snapLevels.docs.forEach((d) => {
      lMap[d.id] = d.data().name;
    });
    setLevelMap(lMap);

    // Subjects
    const snapSubjects = await getDocs(collection(db, "subjects"));
    const sMap: NameMap = {};
    snapSubjects.docs.forEach((d) => {
      sMap[d.id] = d.data().name;
    });
    setSubjectMap(sMap);

    // Courses
    const snapCourses = await getDocs(collection(db, "courses"));
    const cMap: { [id: string]: Course } = {};
    snapCourses.docs.forEach((d) => {
      cMap[d.id] = { id: d.id, ...d.data() } as Course;
    });
    setCourseMap(cMap);

    setLoading(false);
  };

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

  const handleOrderChange = async (exoId: string, newOrder: number) => {
    const ref = doc(db, "exercises", exoId);
    await setDoc(ref, { order: newOrder }, { merge: true });
    fetchData();
  };

  // 🔹 Réorganisation par drag & drop
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const reordered = Array.from(filteredExos);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    // 🔹 Mettre à jour l'ordre uniquement dans ce cours
    const batch = writeBatch(db);
    reordered.forEach((exo, index) => {
      const ref = doc(db, "exercises", exo.id);
      batch.update(ref, { order: index + 1 });
    });
    await batch.commit();

    fetchData();
  };

  // 🔹 Filtrage par level / subject / course
  const filteredExos = exos
    .filter((e) => {
      const course = courseMap[e.course_id];
      if (!course) return false;

      return (
        (!selectedLevel || levelMap[course.levelId] === selectedLevel) &&
        (!selectedSubject || subjectMap[course.subjectId] === selectedSubject) &&
        (!selectedCourse || course.title === selectedCourse)
      );
    })
    .sort((a, b) => a.order - b.order);

  // 🔹 Options uniques pour select
  const levelOptions = Array.from(
    new Set(
      Object.values(courseMap)
        .map((c) => levelMap[c.levelId])
        .filter(Boolean)
    )
  );
  const subjectOptions = Array.from(
    new Set(
      Object.values(courseMap)
        .map((c) => subjectMap[c.subjectId])
        .filter(Boolean)
    )
  );
  const courseOptions = Array.from(
    new Set(Object.values(courseMap).map((c) => c.title).filter(Boolean))
  );

  if (editing) {
    return (
      <ExoForm
        initial={editing}
        editMode
        onCancel={() => setEditing(null)}
        onSubmit={handleSaveEdit}
      />
    );
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
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="">Toutes les matières</option>
          {subjectOptions.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>

        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="">Tous les cours</option>
          {courseOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500 italic">Chargement...</p>
      ) : filteredExos.length === 0 ? (
        <p className="text-gray-500 italic">Aucun exercice trouvé.</p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="exoList">
            {(provided) => (
              <ul
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {filteredExos.map((exo, index) => {
                  const course = courseMap[exo.course_id];
                  return (
                    <Draggable key={exo.id} draggableId={exo.id} index={index}>
                      {(provided) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="flex justify-between items-center border p-2 rounded hover:bg-gray-50 transition"
                        >
                          <span>
                            <strong className="mr-2">#{exo.order}</strong>{" "}
                            {exo.title} —
                            <em className="text-sm text-gray-500 ml-2">
                              {course?.title} ({levelMap[course?.levelId]} /{" "}
                              {subjectMap[course?.subjectId]})
                            </em>
                          </span>
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              className="w-16 border rounded px-1"
                              value={exo.order}
                              onChange={(e) =>
                                handleOrderChange(
                                  exo.id,
                                  Number(e.target.value)
                                )
                              }
                            />
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
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}

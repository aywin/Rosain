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
  query,
  where,
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
  difficulty?: "facile" | "moyen" | "difficile";
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

  const [editingOrders, setEditingOrders] = useState<{ [key: string]: string }>({});

  const fetchData = async () => {
    setLoading(true);

    const snapExos = await getDocs(collection(db, "exercises"));
    const exosData: Exo[] = snapExos.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Exo)
    );
    setExos(exosData);

    const snapLevels = await getDocs(collection(db, "levels"));
    const lMap: NameMap = {};
    snapLevels.docs.forEach((d) => {
      lMap[d.id] = d.data().name;
    });
    setLevelMap(lMap);

    const snapSubjects = await getDocs(collection(db, "subjects"));
    const sMap: NameMap = {};
    snapSubjects.docs.forEach((d) => {
      sMap[d.id] = d.data().name;
    });
    setSubjectMap(sMap);

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
    const exo = exos.find((e) => e.id === exoId);
    if (!exo || newOrder < 1) return;

    const oldOrder = exo.order;
    if (oldOrder === newOrder) return;

    const sameCourseExos = exos
      .filter((e) => e.course_id === exo.course_id && e.id !== exoId)
      .sort((a, b) => a.order - b.order);

    const batch = writeBatch(db);

    if (newOrder < oldOrder) {
      sameCourseExos.forEach((e) => {
        if (e.order >= newOrder && e.order < oldOrder) {
          batch.update(doc(db, "exercises", e.id), { order: e.order + 1 });
        }
      });
    } else if (newOrder > oldOrder) {
      sameCourseExos.forEach((e) => {
        if (e.order > oldOrder && e.order <= newOrder) {
          batch.update(doc(db, "exercises", e.id), { order: e.order - 1 });
        }
      });
    }

    batch.update(doc(db, "exercises", exoId), { order: newOrder });

    await batch.commit();
    setEditingOrders((prev) => {
      const newState = { ...prev };
      delete newState[exoId];
      return newState;
    });
    fetchData();
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const reordered = Array.from(filteredExos);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    const batch = writeBatch(db);
    reordered.forEach((exo, index) => {
      const ref = doc(db, "exercises", exo.id);
      batch.update(ref, { order: index + 1 });
    });
    await batch.commit();

    fetchData();
  };

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📚</span>
        <h2 className="text-2xl font-bold text-gray-800">Exercices existants</h2>
        <span className="ml-auto bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
          {filteredExos.length} exercice{filteredExos.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Niveau
          </label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          >
            <option value="">Tous les niveaux</option>
            {levelOptions.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Matière
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          >
            <option value="">Toutes les matières</option>
            {subjectOptions.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cours
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          >
            <option value="">Tous les cours</option>
            {courseOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-500">Chargement...</p>
        </div>
      ) : filteredExos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <span className="text-5xl mb-4 block">📭</span>
          <p className="text-gray-500 text-lg">Aucun exercice trouvé.</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="exoList">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {filteredExos.map((exo, index) => {
                  const course = courseMap[exo.course_id];
                  return (
                    <Draggable key={exo.id} draggableId={exo.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-gradient-to-r from-white to-gray-50 border rounded-xl p-4 transition-all duration-200 ${snapshot.isDragging
                            ? "shadow-2xl scale-105 border-blue-400"
                            : "shadow-sm hover:shadow-md border-gray-200"
                            }`}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              {...provided.dragHandleProps}
                              className="flex-shrink-0 cursor-grab active:cursor-grabbing mt-1"
                            >
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                                {exo.order}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                {exo.title}
                              </h3>
                              <p className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{course?.title}</span>
                                <span className="text-gray-400">•</span>
                                <span>{levelMap[course?.levelId]}</span>
                                <span className="text-gray-400">•</span>
                                <span>{subjectMap[course?.subjectId]}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                value={
                                  editingOrders[exo.id] !== undefined
                                    ? editingOrders[exo.id]
                                    : exo.order
                                }
                                onChange={(e) =>
                                  setEditingOrders((prev) => ({
                                    ...prev,
                                    [exo.id]: e.target.value,
                                  }))
                                }
                                onBlur={() => {
                                  const newOrder = Number(editingOrders[exo.id]);
                                  if (newOrder && newOrder !== exo.order) {
                                    handleOrderChange(exo.id, newOrder);
                                  } else {
                                    setEditingOrders((prev) => {
                                      const newState = { ...prev };
                                      delete newState[exo.id];
                                      return newState;
                                    });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.currentTarget.blur();
                                  }
                                }}
                              />

                              <button
                                className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow flex items-center gap-2"
                                onClick={() => setEditing(exo)}
                              >
                                <span>✏️</span>
                                <span className="hidden sm:inline">Edit</span>
                              </button>

                              <button
                                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow flex items-center gap-2"
                                onClick={() => handleDelete(exo.id)}
                              >
                                <span>🗑️</span>
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
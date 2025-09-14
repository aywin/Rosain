"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, updateDoc, doc, addDoc, deleteDoc } from "firebase/firestore";
import CourseForm from "./CourseForm";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";

export default function CourseList() {
  const [courses, setCourses] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<any>({});

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    await fetchList();
    await fetchRefs();
  };

  const fetchList = async () => {
    const snap = await getDocs(collection(db, "courses"));
    setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchRefs = async () => {
    const levelsSnap = await getDocs(collection(db, "levels"));
    setLevels(levelsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    const subjectsSnap = await getDocs(collection(db, "subjects"));
    setSubjects(subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const getLevelName = (id: string) => levels.find(l => l.id === id)?.name || id;
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || id;

  const handleAdd = async (data: any) => {
    await addDoc(collection(db, "courses"), {
      ...data,
      created_at: new Date(),
    });
    await fetchList();
  };

  const handleEdit = async (id: string, data: any) => {
    await updateDoc(doc(db, "courses", id), data);
    setEditing(null);
    setEditInitial({});
    await fetchList();
  };

  const handleDelete = async (id: string) => {
    const courseToDelete = courses.find(c => c.id === id);
    if (!courseToDelete) return;

    await deleteDoc(doc(db, "courses", id));

    // Réajuster les ordres du même niveau/matière
    const sameGroup = courses
      .filter(c => c.id !== id && c.level_id === courseToDelete.level_id && c.subject_id === courseToDelete.subject_id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    let newOrder = 1;
    for (const c of sameGroup) {
      await updateDoc(doc(db, "courses", c.id), { order: newOrder });
      newOrder++;
    }

    setCourses(courses.filter(c => c.id !== id));
  };

  const swapOrder = async (courseId: string, direction: "up" | "down") => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const sameGroup = courses
      .filter(c => c.level_id === course.level_id && c.subject_id === course.subject_id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const index = sameGroup.findIndex(c => c.id === courseId);
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === sameGroup.length - 1) return;

    const swapWithIndex = direction === "up" ? index - 1 : index + 1;
    const swapCourse = sameGroup[swapWithIndex];

    // Échanger les ordres
    await updateDoc(doc(db, "courses", course.id), { order: swapCourse.order });
    await updateDoc(doc(db, "courses", swapCourse.id), { order: course.order });

    await fetchList();
  };

  return (
    <div>
      <CourseForm onSubmit={handleAdd} />
      <ul>
        {courses
          .sort((a, b) => {
            if (a.level_id !== b.level_id) return a.level_id.localeCompare(b.level_id);
            if (a.subject_id !== b.subject_id) return a.subject_id.localeCompare(b.subject_id);
            return (a.order || 0) - (b.order || 0);
          })
          .map(c => (
            <li key={c.id} className="mb-3 bg-white p-3 rounded shadow flex flex-col gap-2">
              {editing === c.id ? (
                <CourseForm
                  onSubmit={data => handleEdit(c.id, data)}
                  initial={editInitial}
                  editMode
                  onCancel={() => {
                    setEditing(null);
                    setEditInitial({});
                  }}
                />
              ) : (
                <>
                  <div className="font-bold flex justify-between items-center">
                    {c.title}
                    <span className="flex items-center gap-1">
                      Ordre: {c.order}
                      <button
                        onClick={() => swapOrder(c.id, "up")}
                        className="p-1 rounded hover:bg-gray-200"
                        title="Monter"
                      >
                        <ArrowUpIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => swapOrder(c.id, "down")}
                        className="p-1 rounded hover:bg-gray-200"
                        title="Descendre"
                      >
                        <ArrowDownIcon className="w-4 h-4" />
                      </button>
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">{c.description}</div>
                  <div className="text-xs text-gray-600">
                    Level: {getLevelName(c.level_id)} | Subject: {getSubjectName(c.subject_id)}
                  </div>

                  {c.img && (
                    <div className="mt-2">
                      <img src={c.img} alt={`Image de ${c.title}`} className="max-w-xs rounded shadow" />
                    </div>
                  )}

                  <div className="mt-2 flex gap-2">
                    <button
                      className="text-blue-700 underline"
                      onClick={() => {
                        setEditing(c.id);
                        setEditInitial(c);
                      }}
                    >
                      Edit
                    </button>
                    <button className="text-red-600 underline" onClick={() => handleDelete(c.id)}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
      </ul>
    </div>
  );
}
